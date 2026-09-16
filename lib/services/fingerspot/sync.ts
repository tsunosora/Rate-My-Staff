import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import { mapScanlogs, type RawScan } from "./mapper";
import { pullDeviceLogs, toRawScans } from "./device";

export type DeviceSyncResult = {
  total: number;
  mapped: number;
  synced: number;
  relabeled: number;
  unmatchedCount: number;
  unmatchedPins: string[];
};

const DEVICE_MACHINES = ["fingerspot-ip", "fingerspot"];

/** Kunci hari kalender lokal untuk mengelompokkan scan per hari. */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export type ScanRow = { id: number; employeeId: number; scanDate: Date; scanType: string | null };

/**
 * Fungsi murni: tentukan label in/out per (karyawan, hari) berdasarkan urutan waktu —
 * scan paling awal = "in", sisanya = "out". Kembalikan hanya baris yang labelnya
 * berubah, sebagai { id, scanType }.
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

/**
 * Tentukan in/out berdasarkan URUTAN WAKTU per (karyawan, hari): scan paling awal
 * = "in", sisanya = "out". Shift-agnostik (benar untuk shift pagi/siang/malam),
 * menggantikan heuristik jam-12 yang salah untuk shift sore.
 * Menyimpan koreksi ke DB untuk baris mesin yang labelnya berbeda. Idempoten.
 * Mengembalikan jumlah baris yang labelnya diperbaiki.
 */
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

export type IngestResult = { mapped: number; synced: number; unmatched: string[] };

/**
 * Buat/perbarui karyawan dari data enroll mesin (PIN + nama). Nama placeholder
 * "Karyawan <PIN>" ditimpa dgn nama asli; nama yg sudah diedit manual tidak disentuh.
 */
export async function upsertEmployeeFromDevice(pin: string, name?: string | null): Promise<"created" | "renamed" | "skipped"> {
  const { randomUUID } = await import("node:crypto");
  const { nextEmployeeCode } = await import("@/lib/services/employee-code");
  const clean = (name ?? "").trim();
  const placeholder = `Karyawan ${pin}`;
  const emp = await prisma.employee.findUnique({ where: { machinePin: pin }, select: { id: true, fullName: true } });
  if (emp) {
    if (clean && emp.fullName === placeholder) {
      await prisma.employee.update({ where: { id: emp.id }, data: { fullName: clean } });
      return "renamed";
    }
    return "skipped";
  }
  const fullName = clean || placeholder;
  const code = await nextEmployeeCode(prisma, fullName);
  await prisma.employee.create({ data: { employeeCode: code, machinePin: pin, publicToken: randomUUID(), fullName } });
  return "created";
}

/**
 * Petakan scanlog (PIN→karyawan via machinePin), simpan yang baru (dedup employee+waktu).
 * Dipakai bersama jalur PULL (direct-IP) & PUSH (ADMS /iclock). Label in/out sementara
 * dari mapper; penentuan final via relabelDeviceScans().
 */
export async function ingestScans(
  raws: RawScan[],
  opts: { machineName: string; snMachine?: string | null }
): Promise<IngestResult> {
  const employees = await prisma.employee.findMany({
    where: { deletedAt: null, machinePin: { not: null } },
    select: { id: true, machinePin: true },
  });
  const codeToId = Object.fromEntries(employees.map((e) => [e.machinePin as string, e.id]));

  const { mapped, unmatched } = mapScanlogs(raws, { codeToId });

  let synced = 0;
  for (const m of mapped) {
    const exists = await prisma.attendance.findFirst({
      where: { employeeId: m.employeeId, scanDate: m.scanDate },
      select: { id: true },
    });
    if (exists) continue;
    await prisma.attendance.create({
      data: {
        employeeId: m.employeeId,
        scanDate: m.scanDate,
        scanType: m.scanType,
        status: "on_time",
        machineName: opts.machineName,
        snMachine: opts.snMachine ?? null,
      },
    });
    synced++;
  }
  return { mapped: mapped.length, synced, unmatched };
}

/**
 * Tarik scanlog dari mesin (IP di setting) → petakan PIN→karyawan → simpan yang baru,
 * lalu tentukan in/out per hari berdasarkan urutan waktu (termasuk perbaiki data lama).
 * Dipakai oleh route manual (/api/attendance/device) & cron (/api/fingerspot/cron-pull).
 * Melempar Error bila IP belum diatur atau mesin tak terjangkau.
 */
export async function syncDeviceAttendance(): Promise<DeviceSyncResult> {
  const ip = (await getSetting("fp_device_ip"))?.trim();
  const port = Number(await getSetting("fp_device_port")) || 5005;
  if (!ip) throw new Error("IP mesin belum diatur di Pengaturan.");

  const { count, records } = await pullDeviceLogs({ ip, port });
  const sn = (await getSetting("fingerspot_sn")) || null;

  // Label scanType dari mapper diabaikan; ditentukan ulang per-hari oleh relabel di bawah.
  const { mapped, synced, unmatched } = await ingestScans(toRawScans(records), {
    machineName: "fingerspot-ip",
    snMachine: sn,
  });

  const relabeled = await relabelDeviceScans();

  const unmatchedPins = Array.from(new Set(unmatched));
  return {
    total: count,
    mapped,
    synced,
    relabeled,
    unmatchedCount: unmatchedPins.length,
    unmatchedPins: unmatchedPins.slice(0, 50),
  };
}
