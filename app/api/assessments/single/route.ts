import { prisma } from "@/lib/prisma";
import { requireSession, json, badRequest, route } from "@/lib/http";
import { singleAssessmentSchema } from "@/lib/validators/assessment";
import { buildScores } from "@/lib/services/assessment";
import { notifyAll } from "@/lib/notify";

export const POST = route(async (req: Request) => {
  const session = await requireSession();
  const body = await req.json().catch(() => null);
  const parsed = singleAssessmentSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const d = parsed.data;

  const { scoreRows, totalScore, grade } = await buildScores(prisma, d.templateId, d.scores);
  if (scoreRows.length === 0) return badRequest({ scores: ["Tidak ada skor valid untuk template ini"] });

  const evaluatorId = session.user?.email
    ? (await prisma.user.findUnique({ where: { email: session.user.email } }))?.id ?? null
    : null;

  const assessment = await prisma.assessment.create({
    data: {
      employeeId: d.employeeId,
      templateId: d.templateId,
      evaluatorId,
      isPublic: false,
      assessmentDate: d.assessmentDate ? new Date(d.assessmentDate) : new Date(),
      period: d.period ?? null,
      totalScore,
      grade,
      evaluatorNotes: d.evaluatorNotes ?? null,
      developmentPlan: d.developmentPlan ?? null,
      status: d.status,
      scores: { create: scoreRows },
    },
    include: { scores: true, employee: { select: { fullName: true } } },
  });

  if (assessment.status === "completed") {
    await notifyAll("assessment_completed", {
      title: "Penilaian selesai",
      message: `Penilaian untuk ${assessment.employee.fullName} (skor ${totalScore}) telah diselesaikan.`,
      assessmentId: assessment.id,
    });
  }

  return json(assessment, { status: 201 });
});
