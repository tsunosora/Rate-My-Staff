import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, json, route } from "@/lib/http";

export const GET = route(async (req: Request) => {
  await requireSession();
  const sp = new URL(req.url).searchParams;
  const search = sp.get("search")?.trim() ?? "";
  const departmentId = sp.get("department_id");

  const where: Prisma.EmployeeWhereInput = { deletedAt: null, isActive: true };
  if (search) {
    where.OR = [
      { fullName: { contains: search } },
      { employeeCode: { contains: search } },
    ];
  }
  if (departmentId) where.departmentId = Number(departmentId);

  const data = await prisma.employee.findMany({
    where,
    orderBy: { fullName: "asc" },
    include: { department: true, position: true },
  });
  return json(data);
});
