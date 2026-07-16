import { prisma } from "@/lib/prisma";
import { requireSession, json, badRequest, notFound, route } from "@/lib/http";
import { singleAssessmentSchema } from "@/lib/validators/assessment";
import { buildScores } from "@/lib/services/assessment";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = route<Ctx>(async (req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = singleAssessmentSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const d = parsed.data;

  const existing = await prisma.assessment.findFirst({
    where: { id: Number(id), deletedAt: null },
  });
  if (!existing) return notFound("Assessment not found");

  const { scoreRows, totalScore, grade } = await buildScores(prisma, d.templateId, d.scores);
  if (scoreRows.length === 0) return badRequest({ scores: ["Tidak ada skor valid"] });

  // Ganti skor lama dengan yang baru (delete + create) dalam transaksi.
  const updated = await prisma.$transaction(async (tx) => {
    await tx.assessmentScore.deleteMany({ where: { assessmentId: Number(id) } });
    return tx.assessment.update({
      where: { id: Number(id) },
      data: {
        assessmentDate: d.assessmentDate ? new Date(d.assessmentDate) : existing.assessmentDate,
        period: d.period ?? null,
        totalScore,
        grade,
        evaluatorNotes: d.evaluatorNotes ?? null,
        developmentPlan: d.developmentPlan ?? null,
        status: d.status,
        scores: { create: scoreRows },
      },
      include: { scores: true },
    });
  });

  return json(updated);
});
