import { prisma } from "@/lib/prisma";
import { requireSession, json, route } from "@/lib/http";
import { rentangBulan } from "@/lib/services/assessment-summary";

/**
 * GET /api/reports/guest-rating?year=&month= — rating tamu (QR di nota) untuk seluruh usaha
 * dalam satu bulan: jumlah ulasan, rata-rata, dan berapa yang di bawah bintang 3.
 * Per karyawan tetap di /api/reports/employee/[id]/public-feedbacks.
 */
export const GET = route(async (req: Request) => {
  await requireSession();
  const sp = new URL(req.url).searchParams;
  const { mulai, akhir, year, month } = rentangBulan(sp.get("year"), sp.get("month"));
  const where = { isPublic: true, deletedAt: null, assessmentDate: { gte: mulai, lt: akhir } };

  const [total, agg, rendah] = await Promise.all([
    prisma.assessment.count({ where }),
    prisma.assessment.aggregate({ where, _avg: { totalScore: true } }),
    prisma.assessment.count({ where: { ...where, totalScore: { lt: 3 } } }),
  ]);
  const avg = agg._avg.totalScore == null ? null : Math.round(Number(agg._avg.totalScore) * 100) / 100;
  return json({ year, month, total, average: total ? avg : null, belowThree: rendah });
});
