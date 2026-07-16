import { prisma } from "@/lib/prisma";
import { requireSession, json, route } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

// Feedback publik (rating QR) untuk satu karyawan, paginated.
export const GET = route<Ctx>(async (req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  const page = Math.max(1, Number(new URL(req.url).searchParams.get("page") ?? 1));

  const where = { employeeId: Number(id), isPublic: true, deletedAt: null };
  const [items, total, agg] = await Promise.all([
    prisma.assessment.findMany({
      where,
      orderBy: { assessmentDate: "desc" },
      skip: (page - 1) * 5,
      take: 5,
      select: { id: true, totalScore: true, raterName: true, evaluatorNotes: true, assessmentDate: true },
    }),
    prisma.assessment.count({ where }),
    prisma.assessment.aggregate({ where, _avg: { totalScore: true } }),
  ]);

  return json({
    items,
    total,
    page,
    average: agg._avg.totalScore ? Math.round(Number(agg._avg.totalScore) * 100) / 100 : 0,
  });
});
