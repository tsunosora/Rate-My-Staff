import { prisma } from "@/lib/prisma";
import { requireSession, json, badRequest, notFound, route } from "@/lib/http";
import { editAttendanceSchema } from "@/lib/validators/attendance";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = route<Ctx>(async (req, ctx) => {
  await requireSession();
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
  if (d.status !== undefined) data.status = d.status;
  if (d.absenceReason !== undefined) data.absenceReason = d.absenceReason || null;
  if (d.clockIn) {
    const day = existing.scanDate.toISOString().slice(0, 10);
    data.scanDate = new Date(`${day}T${d.clockIn}:00`);
  }

  const updated = await prisma.attendance.update({ where: { id: Number(id) }, data });
  return json(updated);
});

export const DELETE = route<Ctx>(async (_req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  await prisma.attendance.delete({ where: { id: Number(id) } });
  return json({ ok: true });
});
