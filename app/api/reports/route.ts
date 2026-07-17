import { prisma } from "@/lib/prisma";
import { requireSession, json, route } from "@/lib/http";
import { buildAssessmentWhere } from "@/lib/services/report-filters";

export const GET = route(async (req: Request) => {
  await requireSession();
  const sp = new URL(req.url).searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const where = buildAssessmentWhere(sp);

  const [data, total, all] = await Promise.all([
    prisma.assessment.findMany({
      where,
      skip: (page - 1) * 20,
      take: 20,
      orderBy: { assessmentDate: "desc" },
      include: {
        employee: { include: { department: true } },
        template: { select: { name: true } },
      },
    }),
    prisma.assessment.count({ where }),
    prisma.assessment.findMany({ where, select: { totalScore: true } }),
  ]);

  const scores = all.map((a) => Number(a.totalScore ?? 0));
  const average = scores.length ? scores.reduce((s, x) => s + x, 0) / scores.length : 0;
  const summary = {
    total,
    average: Math.round(average * 100) / 100,
    highPerformers: scores.filter((s) => s >= 4.0).length,
    needsImprovement: scores.filter((s) => s < 3.0).length,
  };

  return json({ data, total, page, perPage: 20, summary });
});
