import { prisma } from "@/lib/prisma";
import { requireSession, json, badRequest, notFound, route } from "@/lib/http";
import { indicatorSchema } from "@/lib/validators/assessment";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = route<Ctx>(async (req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = indicatorSchema.partial().safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const existing = await prisma.assessmentIndicator.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Indicator not found");
  const indicator = await prisma.assessmentIndicator.update({
    where: { id: Number(id) },
    data: parsed.data,
  });
  return json(indicator);
});

export const DELETE = route<Ctx>(async (_req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  await prisma.assessmentIndicator.delete({ where: { id: Number(id) } });
  return json({ ok: true });
});
