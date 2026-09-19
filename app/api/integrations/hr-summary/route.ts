import { prisma } from "@/lib/prisma";
import { json, route } from "@/lib/http";
import { requireIntegrationKey } from "@/lib/services/integrations/guard";
import { aggregateAttendance } from "@/lib/services/attendance/aggregate";
import { pointLeaderboard, isPointsEnabled } from "@/lib/services/points/service";
import { monthPeriod } from "@/lib/services/attendance/period";

/** "YYYY-MM-DD" hari ini menurut kalender lokal (bukan UTC). */
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

const ABSENCE = new Set(["Izin", "Sakit", "Cuti"]);

/**
 * RINGKASAN HR SEKILAS — untuk kartu di aplikasi lain (PosPro).
 *
 * Sengaja ringkas: hanya angka yang bisa dibaca sekilas tanpa membuka RateMyStaff.
 * Detail per hari/karyawan tetap di aplikasi ini.
 *
 * Dipanggil server-ke-server dengan header `x-api-key` (lihat lib/services/integrations/guard.ts).
 */
export const GET = route(async (req: Request) => {
  requireIntegrationKey(req);

  const today = todayStr();
  const now = new Date();
  const period = monthPeriod(now.getFullYear(), now.getMonth() + 1);

  const [aktif, hariIni, pendingLeave, poinAktif] = await Promise.all([
    prisma.employee.count({ where: { deletedAt: null, isActive: true } }),
    aggregateAttendance(prisma, { startStr: today, endStr: today }),
    prisma.leaveRequest.count({ where: { status: "pending" } }),
    isPointsEnabled(),
  ]);

  const rows = hariIni.rows;
  const hadir = rows.filter((r) => r.clockIn);
  const telat = hadir.filter((r) => r.lateMinutes > 0);
  const izin = rows.filter((r) => ABSENCE.has(r.status));
  // Yang belum tercatat sama sekali hari ini = aktif - (hadir + izin).
  const belumAbsen = Math.max(0, aktif - hadir.length - izin.length);

  const topPoin = poinAktif
    ? (await pointLeaderboard(prisma, period.startStr, period.endStr)).slice(0, 3)
    : [];

  return json({
    date: today,
    generatedAt: new Date().toISOString(),
    attendance: {
      employees: aktif,
      present: hadir.length,
      onTime: hadir.length - telat.length,
      late: telat.length,
      leave: izin.length,
      notYetIn: belumAbsen,
      /** 0–100, dari karyawan aktif. */
      rate: aktif > 0 ? Math.round((hadir.length / aktif) * 100) : 0,
    },
    /** Maksimal 5 nama — kartu hanya perlu sekilas, bukan daftar lengkap. */
    lateToday: telat
      .sort((a, b) => b.lateMinutes - a.lateMinutes)
      .slice(0, 5)
      .map((r) => ({ name: r.fullName, clockIn: r.clockIn, lateMinutes: r.lateMinutes })),
    onLeaveToday: izin.slice(0, 5).map((r) => ({ name: r.fullName, type: r.status })),
    pendingLeave,
    points: {
      enabled: poinAktif,
      periodLabel: period.label,
      top: topPoin.map((r) => ({ name: r.fullName, points: r.points })),
    },
  });
});
