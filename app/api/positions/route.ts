import { prisma } from "@/lib/prisma";
import { requireSession, requireManager, json, badRequest, route } from "@/lib/http";
import { positionSchema } from "@/lib/validators/master";

export const GET = route(async () => {
  await requireSession();
  const data = await prisma.position.findMany({
    orderBy: { name: "asc" },
    include: { department: true, _count: { select: { employees: true } } },
  });
  return json(data);
});

export const POST = route(async (req: Request) => {
  await requireManager();
  const body = await req.json().catch(() => null);
  const parsed = positionSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const pos = await prisma.position.create({
    data: { name: parsed.data.name, departmentId: parsed.data.departmentId || null },
  });
  return json(pos, { status: 201 });
});
