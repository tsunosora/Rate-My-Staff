// Backfill multi-mesin (idempoten): buat Machine dari SN yang ada, daftarkan
// karyawan lama (Employee.machinePin) sebagai MachineEnrollment pada mesin utama,
// lalu isi Attendance.machineId untuk absensi mesin yang belum ber-machineId.
// Jalankan: npx tsx prisma/backfill-machines.ts
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();
const DEVICE = ["fingerspot-ip", "fingerspot"];

async function main() {
  // 1. SN unik dari absensi mesin
  const rows = await prisma.attendance.findMany({
    where: { machineName: { in: DEVICE }, snMachine: { not: null } },
    distinct: ["snMachine"],
    select: { snMachine: true },
  });
  const sns = rows.map((r) => r.snMachine).filter((s): s is string => !!s && s.trim() !== "");

  const snSetting = await prisma.setting.findUnique({ where: { key: "fingerspot_sn" } });
  const primarySn = (snSetting?.value?.trim() || sns[0] || "PRIMARY").trim();

  // 2. Upsert mesin utama + tiap SN
  const allSns = Array.from(new Set([primarySn, ...sns]));
  const snToMachine = new Map<string, number>();
  for (const sn of allSns) {
    const name = sn === primarySn ? "Mesin Utama" : `Mesin ${sn.slice(-4)}`;
    const m = await prisma.machine.upsert({
      where: { sn },
      update: {},
      create: { sn, name, lastSeenAt: new Date() },
    });
    snToMachine.set(sn, m.id);
  }
  const primaryId = snToMachine.get(primarySn)!;
  console.log(`Mesin utama: ${primarySn} (id ${primaryId}); total mesin: ${allSns.length}`);

  // 3. Enroll karyawan lama (machinePin) pada mesin utama
  const emps = await prisma.employee.findMany({
    where: { deletedAt: null, machinePin: { not: null } },
    select: { id: true, machinePin: true, fullName: true },
  });
  let enrolled = 0;
  for (const e of emps) {
    const pin = e.machinePin as string;
    const exists = await prisma.machineEnrollment.findUnique({
      where: { machineId_pin: { machineId: primaryId, pin } },
      select: { id: true },
    });
    if (exists) continue;
    await prisma.machineEnrollment.create({
      data: { machineId: primaryId, pin, employeeId: e.id, deviceName: e.fullName },
    });
    enrolled++;
  }
  console.log(`Enrollment dibuat: ${enrolled} (dari ${emps.length} karyawan ber-PIN)`);

  // 4. Backfill Attendance.machineId
  let filled = 0;
  for (const sn of sns) {
    const mid = snToMachine.get(sn);
    if (!mid) continue;
    const r = await prisma.attendance.updateMany({
      where: { machineName: { in: DEVICE }, snMachine: sn, machineId: null },
      data: { machineId: mid },
    });
    filled += r.count;
  }
  // sisa (snMachine null/kosong) → mesin utama
  const rest = await prisma.attendance.updateMany({
    where: { machineName: { in: DEVICE }, machineId: null },
    data: { machineId: primaryId },
  });
  filled += rest.count;
  console.log(`Attendance.machineId diisi: ${filled}`);
}

main()
  .then(() => console.log("Backfill selesai."))
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
