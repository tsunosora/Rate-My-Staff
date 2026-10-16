import { prisma } from "@/lib/prisma";
import { requireSession, json, route } from "@/lib/http";
import { rentangBulan, ringkasPenilaian } from "@/lib/services/assessment-summary";

/**
 * GET /api/assessments/ringkasan?year=&month= — penilaian INTERNAL (bukan rating tamu) satu
 * bulan menurut tanggal penilaian: jumlah per status, sebaran grade, dan penilaian terakhir
 * tiap karyawan. Dipakai layar Penilaian kinerja di aplikasi HP Owner.
 */
export const GET = route(async (req: Request) => {
  await requireSession();
  const sp = new URL(req.url).searchParams;
  const { mulai, akhir, year, month } = rentangBulan(sp.get("year"), sp.get("month"));

  const rows = await prisma.assessment.findMany({
    where: { deletedAt: null, isPublic: false, assessmentDate: { gte: mulai, lt: akhir } },
    orderBy: [{ assessmentDate: "desc" }, { id: "desc" }],
    select: {
      id: true,
      employeeId: true,
      totalScore: true,
      grade: true,
      status: true,
      assessmentDate: true,
      raterName: true,
      employee: { select: { fullName: true, department: { select: { name: true } } } },
      evaluator: { select: { name: true } },
    },
  });

  return json({
    year,
    month,
    ...ringkasPenilaian(
      rows.map((r) => ({
        id: r.id,
        employeeId: r.employeeId,
        fullName: r.employee.fullName,
        department: r.employee.department?.name ?? null,
        totalScore: r.totalScore == null ? null : Number(r.totalScore),
        grade: r.grade,
        status: r.status,
        assessmentDate: r.assessmentDate.toISOString(),
        evaluator: r.evaluator?.name ?? r.raterName ?? null,
      }))
    ),
  });
});
