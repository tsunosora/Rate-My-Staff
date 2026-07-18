import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, notFound, route } from "@/lib/http";
import { indicatorSchema } from "@/lib/validators/assessment";

type Ctx = { params: Promise<{ id: string }> };

export const POST = route<Ctx>(async (req, ctx) => {
  await requireManager();
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = indicatorSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const tpl = await prisma.assessmentTemplate.findUnique({ where: { id: Number(id) } });
  if (!tpl) return notFound("Template not found");
  const indicator = await prisma.assessmentIndicator.create({
    data: { ...parsed.data, templateId: Number(id) },
  });
  return json(indicator, { status: 201 });
});
