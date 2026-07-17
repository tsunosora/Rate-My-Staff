import type { Prisma } from "@prisma/client";

/** Bangun where clause assessment dari query params (dipakai list & export). */
export function buildAssessmentWhere(sp: URLSearchParams): Prisma.AssessmentWhereInput {
  // Laporan official = penilaian internal saja; rating publik (QR) dikecualikan
  // agar tidak mengotori rata-rata & statistik. Feedback publik dilihat terpisah
  // via endpoint reports/employee/[id]/public-feedbacks.
  const where: Prisma.AssessmentWhereInput = { deletedAt: null, status: "completed", isPublic: false };
  const period = sp.get("period");
  const department = sp.get("department");
  const search = sp.get("search")?.trim();
  const category = sp.get("performance_category");

  if (period) where.period = period;
  if (department) where.employee = { departmentId: Number(department) };
  if (search) where.employee = { ...(where.employee as object), fullName: { contains: search } };
  if (category === "high") where.totalScore = { gte: 4.0 };
  else if (category === "average") where.totalScore = { gte: 3.0, lt: 4.0 };
  else if (category === "needs_improvement") where.totalScore = { lt: 3.0 };

  return where;
}
