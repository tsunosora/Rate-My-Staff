import { prisma } from "@/lib/prisma";
import { requireSession, json, route } from "@/lib/http";

function ymKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function dKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const GET = route(async () => {
  const session = await requireSession();

  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const sevenDaysAgo = new Date(now.getTime() - 6 * 86400000);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const [employees, pendingReviews, completed, unread, recentAssessments, recentAttendance] =
    await Promise.all([
      prisma.employee.count({ where: { deletedAt: null, isActive: true } }),
      prisma.assessment.count({ where: { deletedAt: null, status: "draft" } }),
      prisma.assessment.findMany({
        where: { deletedAt: null, status: "completed", isPublic: false },
        select: { totalScore: true, assessmentDate: true },
      }),
      session.user?.email
        ? prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } }).then((u) =>
            u ? prisma.notification.count({ where: { userId: u.id, readAt: null } }) : 0
          )
        : 0,
      prisma.assessment.findMany({
        where: { deletedAt: null, status: "completed" },
        orderBy: { assessmentDate: "desc" },
        take: 5,
        include: { employee: { select: { fullName: true } } },
      }),
      prisma.attendance.findMany({
        where: { scanDate: { gte: sevenDaysAgo } },
        select: { scanDate: true, status: true, scanType: true, employeeId: true },
      }),
    ]);

  const scores = completed.map((a) => Number(a.totalScore ?? 0));
  const avgScore = scores.length ? Math.round((scores.reduce((s, x) => s + x, 0) / scores.length) * 100) / 100 : 0;

  // Tren performa 6 bulan.
  const monthBuckets = new Map<string, number[]>();
  for (const a of completed) {
    if (a.assessmentDate < sixMonthsAgo) continue;
    const k = ymKey(a.assessmentDate);
    (monthBuckets.get(k) ?? monthBuckets.set(k, []).get(k)!).push(Number(a.totalScore ?? 0));
  }
  const performanceTrend: { month: string; avg: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const k = ymKey(d);
    const arr = monthBuckets.get(k) ?? [];
    performanceTrend.push({
      month: k,
      avg: arr.length ? Math.round((arr.reduce((s, x) => s + x, 0) / arr.length) * 100) / 100 : 0,
    });
  }

  // Tren absensi 7 hari.
  const dayMap = new Map<string, { onTime: Set<number>; late: Set<number>; absent: Set<number> }>();
  for (const a of recentAttendance) {
    const k = dKey(a.scanDate);
    const b = dayMap.get(k) ?? { onTime: new Set(), late: new Set(), absent: new Set() };
    if (a.scanType === "absence") b.absent.add(a.employeeId);
    else if (a.status === "late") b.late.add(a.employeeId);
    else if (a.status === "on_time") b.onTime.add(a.employeeId);
    dayMap.set(k, b);
  }
  const attendanceTrend: { date: string; onTime: number; late: number; absent: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const k = dKey(d);
    const b = dayMap.get(k);
    attendanceTrend.push({
      date: k,
      onTime: b?.onTime.size ?? 0,
      late: b?.late.size ?? 0,
      absent: b?.absent.size ?? 0,
    });
  }

  // Alerts.
  const todayKey = dKey(now);
  const todayAtt = recentAttendance.filter((a) => dKey(a.scanDate) === todayKey);
  const alerts: string[] = [];
  const absentToday = new Set(todayAtt.filter((a) => a.scanType === "absence").map((a) => a.employeeId)).size;
  if (absentToday > 0) alerts.push(`${absentToday} karyawan tidak hadir hari ini.`);
  if (pendingReviews > 0) alerts.push(`${pendingReviews} penilaian masih draft.`);
  const lowScorers = scores.filter((s) => s < 3.0).length;
  if (lowScorers > 0) alerts.push(`${lowScorers} penilaian di bawah 3.0.`);

  return json({
    kpis: { employees, pendingReviews, avgScore, unread },
    performanceTrend,
    attendanceTrend,
    alerts,
    recentActivity: recentAssessments.map((a) => ({
      id: a.id,
      text: `Penilaian ${a.employee.fullName} — skor ${Number(a.totalScore ?? 0).toFixed(2)}`,
      date: a.assessmentDate,
    })),
  });
});
