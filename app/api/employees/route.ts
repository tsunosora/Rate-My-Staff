import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, requireManager, json, badRequest, route } from "@/lib/http";
import { employeeCreateSchema } from "@/lib/validators/employee";
import { nextEmployeeCode } from "@/lib/services/employee-code";

const PER_PAGE = 20;

export const GET = route(async (req: Request) => {
  await requireSession();
  const url = new URL(req.url);
  const sp = url.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const search = sp.get("search")?.trim() ?? "";
  const departmentId = sp.get("department_id");
  const isActive = sp.get("is_active");

  const where: Prisma.EmployeeWhereInput = { deletedAt: null };
  if (search) {
    where.OR = [
      { fullName: { contains: search } },
      { employeeCode: { contains: search } },
      { machinePin: { contains: search } },
      { nickname: { contains: search } },
    ];
  }
  if (departmentId) where.departmentId = Number(departmentId);
  if (isActive === "true" || isActive === "false") where.isActive = isActive === "true";

  const [data, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      orderBy: { fullName: "asc" },
      include: { department: true, position: true, workSchedule: true },
    }),
    prisma.employee.count({ where }),
  ]);

  return json({ data, total, page, perPage: PER_PAGE });
});

export const POST = route(async (req: Request) => {
  await requireManager();
  const body = await req.json().catch(() => null);
  const parsed = employeeCreateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const d = parsed.data;
  const code = await nextEmployeeCode(prisma, d.nickname || d.fullName);

  const employee = await prisma.employee.create({
    data: {
      employeeCode: code,
      machinePin: d.machinePin || null,
      publicToken: randomUUID(),
      fullName: d.fullName,
      nickname: d.nickname || null,
      departmentId: d.departmentId || null,
      positionId: d.positionId || null,
      workScheduleId: d.workScheduleId || null,
      joinDate: d.joinDate ? new Date(d.joinDate) : null,
      salary: d.salary ?? null,
      email: d.email || null,
      phone: d.phone || null,
    },
    include: { department: true, position: true, workSchedule: true },
  });

  return json(employee, { status: 201 });
});
