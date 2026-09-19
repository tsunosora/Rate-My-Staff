import type { PrismaClient } from "@prisma/client";
import { parseIoTime } from "./realtime";
import { ingestScansForMachine, relabelDeviceScans } from "./sync";

/**
 * Pengelolaan pendaftaran PIN per mesin untuk mesin mode CLOUD.
 *
 * Mesin cloud tak bisa "ditarik" seperti mode LAN — ia yang menelepon server. Akibatnya
 * dulu tak ada cara mendaftarkan karyawan lama ke mesin baru, dan setiap scan dari PIN
 * yang belum terdaftar DIBUANG diam-diam (lihat ingestScansForMachine). Modul ini
 * menutup lubang itu: menampilkan PIN yang tertahan, menyalin pendaftaran dari mesin
 * lain, dan menarik ulang scan yang sempat terbuang.
 */

export type PendingPin = {
  pin: string;
  /** Jumlah scan yang tertahan karena PIN ini belum dipetakan. */
  count: number;
  firstAt: string | null;
  lastAt: string | null;
  /** Nama karyawan pemilik PIN yang sama di mesin lain — usulan pemetaan. */
  suggestion: { employeeId: number; fullName: string; machineName: string } | null;
};

type GlogBody = { request_code?: string; data?: { user_id?: unknown; io_time?: unknown } };

/** Ambil seluruh scan mentah (realtime_glog) milik satu mesin. */
async function rawScansOf(prisma: PrismaClient, sn: string) {
  const rows = await prisma.fingerspotRawLog.findMany({
    where: { snMachine: sn, pin: { not: null } },
    select: { pin: true, rawBody: true, createdAt: true },
    orderBy: { id: "asc" },
  });
  const out: { pin: string; scanAt: Date }[] = [];
  for (const r of rows) {
    const body = r.rawBody as GlogBody;
    if (body?.request_code !== "realtime_glog") continue;
    const scanAt = parseIoTime(body.data?.io_time);
    const pin = String(r.pin ?? "").trim();
    if (pin && scanAt) out.push({ pin, scanAt });
  }
  return out;
}

/**
 * PIN yang pernah men-scan di mesin ini tapi belum dipetakan ke karyawan —
 * beserta jumlah scan yang tertahan dan usulan pemiliknya dari mesin lain.
 */
export async function pendingPinsForMachine(
  prisma: PrismaClient,
  machineId: number
): Promise<PendingPin[]> {
  const machine = await prisma.machine.findUnique({ where: { id: machineId } });
  if (!machine) return [];

  const enrolled = new Set(
    (await prisma.machineEnrollment.findMany({ where: { machineId }, select: { pin: true } })).map(
      (e) => e.pin
    )
  );

  const grouped = new Map<string, { count: number; first: Date; last: Date }>();
  for (const s of await rawScansOf(prisma, machine.sn)) {
    if (enrolled.has(s.pin)) continue;
    const g = grouped.get(s.pin);
    if (g) {
      g.count++;
      if (s.scanAt < g.first) g.first = s.scanAt;
      if (s.scanAt > g.last) g.last = s.scanAt;
    } else {
      grouped.set(s.pin, { count: 1, first: s.scanAt, last: s.scanAt });
    }
  }
  if (grouped.size === 0) return [];

  // Usulan: PIN yang sama sudah dipetakan di mesin lain — hampir selalu orang yang sama.
  const lain = await prisma.machineEnrollment.findMany({
    where: { machineId: { not: machineId }, pin: { in: [...grouped.keys()] } },
    select: {
      pin: true,
      employeeId: true,
      employee: { select: { fullName: true } },
      machine: { select: { name: true } },
    },
  });
  const usul = new Map(
    lain.map((l) => [
      l.pin,
      { employeeId: l.employeeId, fullName: l.employee.fullName, machineName: l.machine.name },
    ])
  );

  return [...grouped.entries()]
    .map(([pin, g]) => ({
      pin,
      count: g.count,
      firstAt: g.first.toISOString(),
      lastAt: g.last.toISOString(),
      suggestion: usul.get(pin) ?? null,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Tarik ulang seluruh scan mentah milik mesin ini. Aman diulang: ingestScansForMachine
 * melewati scan yang jam & karyawannya sudah ada.
 */
export async function reingestMachineScans(
  prisma: PrismaClient,
  machineId: number
): Promise<{ total: number; synced: number; stillUnmatched: string[] }> {
  const machine = await prisma.machine.findUnique({ where: { id: machineId } });
  if (!machine) throw new Error("Mesin tidak ditemukan.");

  const scans = await rawScansOf(prisma, machine.sn);
  if (scans.length === 0) return { total: 0, synced: 0, stillUnmatched: [] };

  const { synced, unmatched } = await ingestScansForMachine(machine.id, machine.sn, scans);
  if (synced > 0) await relabelDeviceScans();
  return { total: scans.length, synced, stillUnmatched: unmatched };
}

/** Salin pemetaan PIN→karyawan dari mesin lain; PIN yang sudah ada di tujuan dilewati. */
export async function copyEnrollments(
  prisma: PrismaClient,
  toMachineId: number,
  fromMachineId: number
): Promise<{ copied: number; skipped: number }> {
  if (toMachineId === fromMachineId) throw new Error("Mesin asal dan tujuan sama.");

  const sumber = await prisma.machineEnrollment.findMany({
    where: { machineId: fromMachineId },
    select: { pin: true, employeeId: true, deviceName: true },
  });
  const adaDiTujuan = new Set(
    (
      await prisma.machineEnrollment.findMany({
        where: { machineId: toMachineId },
        select: { pin: true },
      })
    ).map((e) => e.pin)
  );

  let copied = 0;
  let skipped = 0;
  for (const s of sumber) {
    if (adaDiTujuan.has(s.pin)) {
      skipped++;
      continue;
    }
    await prisma.machineEnrollment.create({
      data: {
        machineId: toMachineId,
        pin: s.pin,
        employeeId: s.employeeId,
        deviceName: s.deviceName,
      },
    });
    copied++;
  }
  return { copied, skipped };
}
