import { prisma } from "@/lib/prisma";
import { requireSession, json, route } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = route<Ctx>(async (_req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  await prisma.holiday.delete({ where: { id: Number(id) } });
  return json({ ok: true });
});
