import { prisma } from "@/lib/prisma";
import { requireSession, json, route } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async (_req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  await prisma.notification.updateMany({
    where: { id, readAt: null },
    data: { readAt: new Date() },
  });
  return json({ ok: true });
});
