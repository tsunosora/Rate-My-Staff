import { prisma } from "@/lib/prisma";
import { requireSession, json, route } from "@/lib/http";

export const GET = route(async () => {
  await requireSession();
  const data = await prisma.workSchedule.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
  });
  return json(data);
});
