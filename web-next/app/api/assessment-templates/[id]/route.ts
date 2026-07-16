import { prisma } from "@/lib/prisma";
import { requireSession, json, badRequest, notFound, route } from "@/lib/http";
import { templateSchema } from "@/lib/validators/assessment";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  const tpl = await prisma.assessmentTemplate.findUnique({
    where: { id: Number(id) },
    include: { indicators: { orderBy: { sortOrder: "asc" } } },
  });
  if (!tpl) return notFound("Template not found");
  return json(tpl);
});

export const PUT = route<Ctx>(async (req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = templateSchema.partial().safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const existing = await prisma.assessmentTemplate.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Template not found");
  const tpl = await prisma.assessmentTemplate.update({
    where: { id: Number(id) },
    data: parsed.data,
    include: { indicators: { orderBy: { sortOrder: "asc" } } },
  });
  return json(tpl);
});

export const DELETE = route<Ctx>(async (_req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  await prisma.assessmentTemplate.delete({ where: { id: Number(id) } });
  return json({ ok: true });
});
