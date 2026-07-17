import { prisma } from "@/lib/prisma";
import { requireSession, json, badRequest, notFound, route } from "@/lib/http";
import { employeeUpdateSchema } from "@/lib/validators/employee";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  const employee = await prisma.employee.findFirst({
    where: { id: Number(id), deletedAt: null },
    include: {
      department: true,
      position: true,
      workSchedule: true,
      assessments: {
        where: { deletedAt: null },
        orderBy: { assessmentDate: "desc" },
        take: 10,
      },
    },
  });
  if (!employee) return notFound("Employee not found");
  return json(employee);
});

export const PUT = route<Ctx>(async (req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = employeeUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const existing = await prisma.employee.findFirst({
    where: { id: Number(id), deletedAt: null },
  });
  if (!existing) return notFound("Employee not found");

  const d = parsed.data;
  const employee = await prisma.employee.update({
    where: { id: Number(id) },
    data: {
      ...(d.fullName !== undefined && { fullName: d.fullName }),
      ...(d.nickname !== undefined && { nickname: d.nickname || null }),
      ...(d.departmentId !== undefined && { departmentId: d.departmentId || null }),
      ...(d.positionId !== undefined && { positionId: d.positionId || null }),
      ...(d.workScheduleId !== undefined && { workScheduleId: d.workScheduleId || null }),
      ...(d.joinDate !== undefined && { joinDate: d.joinDate ? new Date(d.joinDate) : null }),
      ...(d.salary !== undefined && { salary: d.salary ?? null }),
      ...(d.email !== undefined && { email: d.email || null }),
      ...(d.phone !== undefined && { phone: d.phone || null }),
      ...(d.isActive !== undefined && { isActive: d.isActive }),
    },
    include: { department: true, position: true, workSchedule: true },
  });
  return json(employee);
});

export const DELETE = route<Ctx>(async (_req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  const existing = await prisma.employee.findFirst({
    where: { id: Number(id), deletedAt: null },
  });
  if (!existing) return notFound("Employee not found");

  // Soft delete
  await prisma.employee.update({
    where: { id: Number(id) },
    data: { deletedAt: new Date() },
  });
  return json({ ok: true });
});
