import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, notFound, route } from "@/lib/http";
import { editAttendanceSchema } from "@/lib/validators/attendance";
import { makeCalculator } from "@/lib/services/overtime";
import { getSetting } from "@/lib/settings";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = route<Ctx>(async (req, ctx) => {
  await requireManager();
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = editAttendanceSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const existing = await prisma.attendance.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Attendance not found");

  const d = parsed.data;
  const data: Record<string, unknown> = {};
  if (d.lateMinutes !== undefined) data.lateMinutes = d.lateMinutes;
  if (d.overtimeMinutes !== undefined) data.overtimeMinutes = d.overtimeMinutes;
  if (d.approvedOvertimeMinutes !== undefined) data.approvedOvertimeMinutes = d.approvedOvertimeMinutes;
  if (d.overtimeCategoryId !== undefined) data.overtimeCategoryId = d.overtimeCategoryId || null;
  if (d.overtimeReason !== undefined) data.overtimeReason = d.overtimeReason || null;
  if (d.status !== undefined) data.status = d.status;
  if (d.absenceReason !== undefined) data.absenceReason = d.absenceReason || null;
  if (d.clockIn) {
    const day = existing.scanDate.toISOString().slice(0, 10);
    data.scanDate = new Date(`${day}T${d.clockIn}:00`);
  }

  // Hitung ulang nominal lembur bila ada kategori (pakai engine sesuai konteks setting).
  const categoryId = d.overtimeCategoryId ?? existing.overtimeCategoryId;
  const approvedMinutes = d.approvedOvertimeMinutes ?? existing.approvedOvertimeMinutes;
  if (categoryId) {
    const category = await prisma.overtimeCategory.findUnique({ where: { id: categoryId } });
    if (category) {
      const context = await getSetting("overtime_engine_context");
      const calc = makeCalculator(context);
      data.overtimeAmount = calc.calculate({
        category: { name: category.name, type: category.type, rate: Number(category.rate) },
        approvedMinutes,
      });
    }
  }

  const updated = await prisma.attendance.update({ where: { id: Number(id) }, data });
  return json(updated);
});

export const DELETE = route<Ctx>(async (_req, ctx) => {
  await requireManager();
  const { id } = await ctx.params;
  await prisma.attendance.delete({ where: { id: Number(id) } });
  return json({ ok: true });
});
