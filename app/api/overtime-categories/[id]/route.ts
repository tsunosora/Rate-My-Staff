import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, notFound, route } from "@/lib/http";
import { overtimeCategorySchema } from "@/lib/validators/master";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = route<Ctx>(async (req, ctx) => {
  await requireManager();
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = overtimeCategorySchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const existing = await prisma.overtimeCategory.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Overtime category not found");
  const cat = await prisma.overtimeCategory.update({
    where: { id: Number(id) },
    data: parsed.data,
  });
  return json(cat);
});

export const DELETE = route<Ctx>(async (_req, ctx) => {
  await requireManager();
  const { id } = await ctx.params;
  await prisma.overtimeCategory.delete({ where: { id: Number(id) } });
  return json({ ok: true });
});
