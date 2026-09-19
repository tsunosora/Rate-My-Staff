import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, requireManager, json, badRequest, notFound, route } from "@/lib/http";
import {
  pendingPinsForMachine,
  reingestMachineScans,
  copyEnrollments,
} from "@/lib/services/fingerspot/enrollments";

type Ctx = { params: Promise<{ id: string }> };

/** Pendaftaran PIN mesin ini + PIN yang scan-nya tertahan karena belum dipetakan. */
export const GET = route<Ctx>(async (_req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  const machineId = Number(id);

  const machine = await prisma.machine.findUnique({ where: { id: machineId } });
  if (!machine) return notFound("Mesin tidak ditemukan");

  const [enrollments, pending, machines] = await Promise.all([
    prisma.machineEnrollment.findMany({
      where: { machineId },
      select: { id: true, pin: true, deviceName: true, employee: { select: { id: true, fullName: true } } },
      orderBy: { pin: "asc" },
    }),
    pendingPinsForMachine(prisma, machineId),
    prisma.machine.findMany({
      where: { id: { not: machineId } },
      select: { id: true, name: true, _count: { select: { enrollments: true } } },
    }),
  ]);

  return json({
    machine: { id: machine.id, name: machine.name, mode: machine.mode },
    enrollments: enrollments.map((e) => ({
      id: e.id,
      pin: e.pin,
      deviceName: e.deviceName,
      employeeId: e.employee.id,
      employeeName: e.employee.fullName,
    })),
    pending,
    otherMachines: machines.map((m) => ({ id: m.id, name: m.name, enrollments: m._count.enrollments })),
  });
});

/**
 * Aksi pendaftaran mesin (berlaku untuk mode cloud maupun LAN):
 * { action: "map", pin, employeeId } — petakan satu PIN ke karyawan.
 * { action: "unmap", pin }           — lepas pemetaan.
 * { action: "copy", fromMachineId }  — salin pemetaan dari mesin lain.
 * { action: "reingest" }             — tarik ulang scan yang sempat terbuang.
 */
export const POST = route<Ctx>(async (req, ctx) => {
  await requireManager();
  const { id } = await ctx.params;
  const machineId = Number(id);

  const machine = await prisma.machine.findUnique({ where: { id: machineId } });
  if (!machine) return notFound("Mesin tidak ditemukan");

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    pin?: string;
    employeeId?: number;
    fromMachineId?: number;
  };

  try {
    if (body.action === "map") {
      const pin = String(body.pin ?? "").trim();
      const employeeId = Number(body.employeeId);
      if (!pin) return badRequest({ pin: ["PIN wajib diisi."] });
      if (!Number.isInteger(employeeId) || employeeId <= 0) {
        return badRequest({ employeeId: ["Pilih karyawan."] });
      }
      const emp = await prisma.employee.findFirst({ where: { id: employeeId, deletedAt: null } });
      if (!emp) return badRequest({ employeeId: ["Karyawan tidak ditemukan."] });

      // PIN unik per mesin: pemetaan lama untuk PIN yang sama diganti.
      await prisma.machineEnrollment.upsert({
        where: { machineId_pin: { machineId, pin } },
        update: { employeeId },
        create: { machineId, pin, employeeId, deviceName: emp.fullName },
      });
      // Scan yang tertahan untuk PIN ini langsung ditarik masuk.
      const res = await reingestMachineScans(prisma, machineId);
      return json({ ok: true, ...res });
    }

    if (body.action === "unmap") {
      const pin = String(body.pin ?? "").trim();
      await prisma.machineEnrollment.deleteMany({ where: { machineId, pin } });
      return json({ ok: true });
    }

    if (body.action === "copy") {
      const from = Number(body.fromMachineId);
      if (!Number.isInteger(from) || from <= 0) return badRequest({ fromMachineId: ["Pilih mesin asal."] });
      const res = await copyEnrollments(prisma, machineId, from);
      const ingest = await reingestMachineScans(prisma, machineId);
      return json({ ok: true, ...res, ...ingest });
    }

    if (body.action === "reingest") {
      return json({ ok: true, ...(await reingestMachineScans(prisma, machineId)) });
    }

    return badRequest({ action: ["Aksi tidak dikenal."] });
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 422 });
  }
});
