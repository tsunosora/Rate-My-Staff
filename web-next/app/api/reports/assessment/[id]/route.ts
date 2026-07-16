import { prisma } from "@/lib/prisma";
import { requireSession, json, notFound, route } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (_req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  const assessment = await prisma.assessment.findFirst({
    where: { id: Number(id), deletedAt: null },
    include: {
      employee: { include: { department: true, position: true } },
      template: true,
      evaluator: { select: { name: true } },
      scores: { include: { indicator: true } },
    },
  });
  if (!assessment) return notFound("Assessment not found");
  return json(assessment);
});
