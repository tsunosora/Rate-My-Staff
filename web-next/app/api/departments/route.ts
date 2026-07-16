import { prisma } from "@/lib/prisma";
import { requireSession, json, route } from "@/lib/http";

export const GET = route(async () => {
  await requireSession();
  const data = await prisma.department.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { employees: true } } },
  });
  return json(data);
});
