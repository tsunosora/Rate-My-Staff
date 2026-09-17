import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import { nextEmployeeCode } from "@/lib/services/employee-code";
import { pullDeviceLogs, toRawScans } from "./device";
import type { RawScan } from "./mapper";

const DEVICE_MACHINES = ["fingerspot-ip", "fingerspot"];

/** Kunci hari kalender lokal untuk mengelompokkan scan per hari. */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export type ScanRow = { id: number; employeeId: number; scanDate: Date; scanType: string | null };

/**
 * Fungsi murni: tentukan label in/out per (karyawan, hari) berdasarkan urutan waktu —
 * scan paling awal = "in", sisanya = "out". Kembalikan hanya baris yang labelnya berubah.
 */
export function computeInOutLabels(rows: ScanRow[]): { id: number; scanType: "in" | "out" }[] {
  const groups = new Map<string, ScanRow[]>();
  for (const r of rows) {
    const key = `${r.employeeId}|${dayKey(r.scanDate)}`;
    const arr = groups.get(key) ?? [];
    arr.push(r);
    groups.set(key, arr);
  }
  const changes: { id: number; scanType: "in" | "out" }[] = [];
  for (const arr of groups.values()) {
    arr.sort((a, b) => a.scanDate.getTime() - b.scanDate.getTime());
    arr.forEach((r, i) => {
      const want = i === 0 ? "in" : "out";
      if (r.scanType !== want) changes.push({ id: r.id, scanType: want });
    });
  }
  return changes;
}

/** Perbaiki in/out per (karyawan, hari) untuk semua absensi dari mesin. Idempoten. */
export async function relabelDeviceScans(): Promise<number> {
  const rows = await prisma.attendance.findMany({
    where: { machineName: { in: DEVICE_MACHINES } },
    select: { id: true, employeeId: true, scanDate: true, scanType: true },
  });
  const changes = computeInOutLabels(rows);
  for (const c of changes) {
    await prisma.attendance.update({ where: { id: c.id }, data: { scanType: c.scanType } });
  }
  return changes.length;
}

/** Cari/buat Mesin berdasarkan SN (dev_id). Nama default "Mesin <4 digit SN akhir>". */
export async function resolveMachine(sn: string | null | undefined): Promise<{ id: number; name: string; sn: string }> {
  const cleanSn = (sn ?? "").trim() || "unknown";
  const existing = await prisma.machine.findUnique({ where: { sn: cleanSn } });
  if (existing) {
    await prisma.machine.update({ where: { id: existing.id }, data: { lastSeenAt: new Date() } });
    return { id: existing.id, name: existing.name, sn: cleanSn };
  }
  const name = cleanSn === "unknown" ? "Mesin Tanpa SN" : `Mesin ${cleanSn.slice(-4)}`;
  const created = await prisma.machine.create({ data: { sn: cleanSn, name, lastSeenAt: new Date() } });
  return { id: created.id, name: created.name, sn: cleanSn };
}

/**
 * Petakan scan dari SATU mesin (PIN unik per mesin, via MachineEnrollment), simpan yang
 * baru (dedup employee+waktu). Label scanType sementara; final via relabelDeviceScans().
 */
export async function ingestScansForMachine(
  machineId: number,
  sn: string | null,
  raws: RawScan[]
): Promise<{ synced: number; unmatched: string[] }> {
  const enrolls = await prisma.machineEnrollment.findMany({
    where: { machineId },
    select: { pin: true, employeeId: true },
  });
  const pinToEmp = new Map(enrolls.map((e) => [e.pin, e.employeeId]));

  let synced = 0;
  const unmatched: string[] = [];
  const seen = new Set<string>();
  for (const raw of raws) {
    const empId = pinToEmp.get(raw.pin);
    if (empId === undefined) { unmatched.push(raw.pin); continue; }
    const scanDate = raw.scanAt instanceof Date ? raw.scanAt : new Date(raw.scanAt);
    if (Number.isNaN(scanDate.getTime())) continue;
    const key = `${empId}|${scanDate.getTime()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const exists = await prisma.attendance.findFirst({
      where: { employeeId: empId, scanDate },
      select: { id: true },
    });
    if (exists) continue;
    await prisma.attendance.create({
      data: {
        employeeId: empId,
        scanDate,
        scanType: scanDate.getHours() < 12 ? "in" : "out", // sementara; diperbaiki relabel
        status: "on_time",
        machineName: "fingerspot",
        snMachine: sn,
        machineId,
      },
    });
    synced++;
  }
  return { synced, unmatched: Array.from(new Set(unmatched)) };
}

/**
 * Daftarkan PIN sebuah MESIN ke karyawan (dari data enroll mesin). Kalau (mesin,PIN)
 * belum ada → buat karyawan baru + enrollment. Nama placeholder "Karyawan <PIN>"
 * ditimpa nama asli; nama yang sudah diedit manual tidak disentuh.
 */
export async function upsertEnrollment(
  machineId: number,
  pin: string,
  name?: string | null
): Promise<"created" | "renamed" | "skipped"> {
  const clean = (name ?? "").trim();
  const placeholder = `Karyawan ${pin}`;
  const existing = await prisma.machineEnrollment.findUnique({
    where: { machineId_pin: { machineId, pin } },
    include: { employee: { select: { id: true, fullName: true } } },
  });
  if (existing) {
    if (clean && existing.employee.fullName === placeholder) {
      await prisma.employee.update({ where: { id: existing.employeeId }, data: { fullName: clean } });
      return "renamed";
    }
    return "skipped";
  }
  const fullName = clean || placeholder;
  const code = await nextEmployeeCode(prisma, fullName);
  const emp = await prisma.employee.create({ data: { employeeCode: code, publicToken: randomUUID(), fullName } });
  await prisma.machineEnrollment.create({ data: { machineId, pin, employeeId: emp.id, deviceName: clean || null } });
  return "created";
}

export type DeviceSyncResult = {
  machineName: string;
  total: number;
  synced: number;
  relabeled: number;
  unmatchedCount: number;
  unmatchedPins: string[];
};

/**
 * Tarik scanlog dari mesin (IP di setting) → petakan per-mesin → simpan yang baru →
 * perbaiki in/out. Dipakai route manual (/api/attendance/device) & cron.
 */
export async function syncDeviceAttendance(): Promise<DeviceSyncResult> {
  const ip = (await getSetting("fp_device_ip"))?.trim();
  const port = Number(await getSetting("fp_device_port")) || 5005;
  if (!ip) throw new Error("IP mesin belum diatur di Pengaturan.");

  const sn = (await getSetting("fingerspot_sn"))?.trim() || `direct-ip:${ip}`;
  const machine = await resolveMachine(sn);

  const { count, records } = await pullDeviceLogs({ ip, port });
  const { synced, unmatched } = await ingestScansForMachine(machine.id, machine.sn, toRawScans(records));
  const relabeled = await relabelDeviceScans();

  const unmatchedPins = Array.from(new Set(unmatched));
  return {
    machineName: machine.name,
    total: count,
    synced,
    relabeled,
    unmatchedCount: unmatchedPins.length,
    unmatchedPins: unmatchedPins.slice(0, 50),
  };
}
