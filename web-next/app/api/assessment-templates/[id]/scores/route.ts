import { prisma } from "@/lib/prisma";
import { requireSession, json, route } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

/** Skor terakhir (assessment terbaru non-public) per karyawan untuk template ini,
 *  dipakai untuk prefill halaman bulk. Bentuk: { [employeeId]: { [indicatorId]: score } } */
export const GET = route<Ctx>(async (_req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;

  const assessments = await prisma.assessment.findMany({
    where: { templateId: Number(id), isPublic: false, deletedAt: null },
    orderBy: { assessmentDate: "desc" },
    include: { scores: true },
  });

  const seen = new Set<number>();
  const result: Record<number, Record<number, number>> = {};
  for (const a of assessments) {
    if (seen.has(a.employeeId)) continue; // hanya yang terbaru per karyawan
    seen.add(a.employeeId);
    result[a.employeeId] = Object.fromEntries(a.scores.map((s) => [s.indicatorId, s.score]));
  }

  return json(result);
});
