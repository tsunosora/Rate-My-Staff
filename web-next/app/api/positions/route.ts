import { prisma } from "@/lib/prisma";
import { requireSession, json, route } from "@/lib/http";

export const GET = route(async () => {
  await requireSession();
  const data = await prisma.position.findMany({
    orderBy: { name: "asc" },
    include: { department: true, _count: { select: { employees: true } } },
  });
  return json(data);
});
