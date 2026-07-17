import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireSession, json, badRequest, notFound, route } from "@/lib/http";
import { workScheduleSchema } from "@/lib/validators/master";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = route<Ctx>(async (req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = workScheduleSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const existing = await prisma.workSchedule.findFirst({
    where: { id: Number(id), deletedAt: null },
  });
  if (!existing) return notFound("Work schedule not found");
  const d = parsed.data;
  const ws = await prisma.workSchedule.update({
    where: { id: Number(id) },
    data: {
      name: d.name,
      startTime: d.startTime || null,
      endTime: d.endTime || null,
      breakStartTime: d.breakStartTime || null,
      breakEndTime: d.breakEndTime || null,
      lateToleranceMinutes: d.lateToleranceMinutes,
      dailyWage: d.dailyWage,
      weeklyWage: d.weeklyWage,
      monthlyWage: d.monthlyWage,
      holidayWage: d.holidayWage,
      overtimeWagePerHour: d.overtimeWagePerHour,
      isHoliday: d.isHoliday,
    },
  });
  return json(ws);
});

export const DELETE = route<Ctx>(async (_req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  const count = await prisma.employee.count({
    where: { workScheduleId: Number(id), deletedAt: null },
  });
  if (count > 0) {
    return NextResponse.json(
      { message: `Tidak bisa dihapus: masih ada ${count} karyawan memakai jadwal ini.` },
      { status: 409 }
    );
  }
  await prisma.workSchedule.update({
    where: { id: Number(id) },
    data: { deletedAt: new Date() },
  });
  return json({ ok: true });
});
