import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { nextEmployeeCode } from "@/lib/services/employee-code";
import { pullDeviceLogs, pullDeviceUsers, toRawScans } from "./device";
import type { RawScan } from "./mapper";
import { recomputeStoredStatus } from "@/lib/services/attendance/recompute";

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
  // Label in/out sudah final -> status/telat/lembur baru bisa dihitung benar.
  // Tanpa ini kolom `status` tetap "on_time" bawaan dan Log Absensi menampilkan
  // semua orang tepat waktu walau datang jam 09.44.
  await recomputeStoredStatus(prisma, { machineNames: DEVICE_MACHINES });
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

/** Tarik absensi dari sebuah mesin mode LAN (pakai IP/port mesin itu). */
export async function syncMachinePull(machineId: number): Promise<DeviceSyncResult> {
  const machine = await prisma.machine.findUnique({ where: { id: machineId } });
  if (!machine) throw new Error("Mesin tidak ditemukan.");
  if (machine.mode !== "lan" || !machine.ip) throw new Error("Mesin ini bukan mode LAN atau IP belum diatur.");
  const port = machine.port || 5005;

  const { count, records } = await pullDeviceLogs({ ip: machine.ip, port });
  const { synced, unmatched } = await ingestScansForMachine(machine.id, machine.sn, toRawScans(records));
  const relabeled = await relabelDeviceScans();
  await prisma.machine.update({ where: { id: machine.id }, data: { lastSeenAt: new Date() } });

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

/** Sinkron karyawan (PIN + nama) dari sebuah mesin mode LAN → enrollment mesin itu. */
export async function syncMachineUsers(machineId: number): Promise<{ machineName: string; total: number; created: number; renamed: number }> {
  const machine = await prisma.machine.findUnique({ where: { id: machineId } });
  if (!machine) throw new Error("Mesin tidak ditemukan.");
  if (machine.mode !== "lan" || !machine.ip) throw new Error("Mesin ini bukan mode LAN atau IP belum diatur.");
  const port = machine.port || 5005;

  const { users } = await pullDeviceUsers({ ip: machine.ip, port });
  let created = 0;
  let renamed = 0;
  for (const u of users) {
    const res = await upsertEnrollment(machine.id, u.pin, u.name);
    if (res === "created") created++;
    else if (res === "renamed") renamed++;
  }
  await prisma.machine.update({ where: { id: machine.id }, data: { lastSeenAt: new Date() } });
  return { machineName: machine.name, total: users.length, created, renamed };
}
