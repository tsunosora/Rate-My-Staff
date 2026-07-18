import { prisma } from "@/lib/prisma";
import { requireSession, requireManager, json, badRequest, route } from "@/lib/http";
import { departmentSchema } from "@/lib/validators/master";

export const GET = route(async () => {
  await requireSession();
  const data = await prisma.department.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { employees: true } } },
  });
  return json(data);
});

export const POST = route(async (req: Request) => {
  await requireManager();
  const body = await req.json().catch(() => null);
  const parsed = departmentSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const dept = await prisma.department.create({ data: { name: parsed.data.name } });
  return json(dept, { status: 201 });
});
