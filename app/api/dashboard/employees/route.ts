import { prisma } from "@/lib/prisma";
import { requireSession, json, route } from "@/lib/http";

/**
 * Ringkasan per karyawan untuk kartu dashboard:
 * skor rata-rata, jumlah hari tepat waktu / terlambat (dari scan "in"),
 * lama kerja (joinDate), dan aktivitas terakhir.
 */
export const GET = route(async () => {
  await requireSession();

  const employees = await prisma.employee.findMany({
    where: { deletedAt: null, isActive: true },
    select: {
      id: true,
      fullName: true,
      nickname: true,
      employeeCode: true,
      joinDate: true,
      department: { select: { name: true } },
      position: { select: { name: true } },
    },
    orderBy: { fullName: "asc" },
  });

  const [attByStatus, izinCounts, lastScan, assess] = await Promise.all([
    // Hitung status per hari dari scan masuk (satu "in" per hari kerja).
    prisma.attendance.groupBy({
      by: ["employeeId", "status"],
      where: { scanType: "in" },
      _count: { _all: true },
    }),
    // Izin / Sakit / Cuti = record ketidakhadiran eksplisit.
    prisma.attendance.groupBy({
      by: ["employeeId"],
      where: { scanType: "absence" },
      _count: { _all: true },
    }),
    prisma.attendance.groupBy({
      by: ["employeeId"],
      _max: { scanDate: true },
    }),
    prisma.assessment.groupBy({
      by: ["employeeId"],
      where: { deletedAt: null, status: "completed", isPublic: false },
      _avg: { totalScore: true },
      _count: { _all: true },
      _max: { assessmentDate: true },
    }),
  ]);

  const onTime = new Map<number, number>();
  const late = new Map<number, number>();
  for (const r of attByStatus) {
    const c = r._count._all;
    if (r.status === "late") late.set(r.employeeId, (late.get(r.employeeId) ?? 0) + c);
    else if (r.status === "on_time" || r.status === "longshift")
      onTime.set(r.employeeId, (onTime.get(r.employeeId) ?? 0) + c);
  }

  const izin = new Map<number, number>();
  for (const r of izinCounts) izin.set(r.employeeId, r._count._all);

  const lastScanAt = new Map<number, Date | null>();
  for (const r of lastScan) lastScanAt.set(r.employeeId, r._max.scanDate);

  const assessMap = new Map<number, { avg: number; count: number; last: Date | null }>();
  for (const r of assess) {
    assessMap.set(r.employeeId, {
      avg: r._avg.totalScore != null ? Math.round(Number(r._avg.totalScore) * 100) / 100 : 0,
      count: r._count._all,
      last: r._max.assessmentDate,
    });
  }

  const cards = employees.map((e) => {
    const a = assessMap.get(e.id);
    const scanAt = lastScanAt.get(e.id) ?? null;
    const assessAt = a?.last ?? null;

    let activity: { text: string; date: string } | null = null;
    if (assessAt && (!scanAt || assessAt >= scanAt)) {
      activity = { text: "Dinilai", date: assessAt.toISOString() };
    } else if (scanAt) {
      activity = { text: "Absensi", date: scanAt.toISOString() };
    }

    return {
      id: e.id,
      fullName: e.fullName,
      nickname: e.nickname,
      employeeCode: e.employeeCode,
      department: e.department?.name ?? null,
      position: e.position?.name ?? null,
      joinDate: e.joinDate ? e.joinDate.toISOString() : null,
      avgScore: a?.avg ?? 0,
      assessmentCount: a?.count ?? 0,
      onTime: onTime.get(e.id) ?? 0,
      late: late.get(e.id) ?? 0,
      izin: izin.get(e.id) ?? 0,
      activity,
    };
  });

  return json({ cards });
});
