import type { PrismaClient } from "@prisma/client";
import { aggregateAttendance } from "@/lib/services/attendance/aggregate";
import { buildEmployeeReceipt } from "@/lib/services/attendance/receipt-source";
import type { ReceiptData } from "@/lib/services/attendance/receipt";
import type { ReceiptPeriod } from "@/lib/services/attendance/period";
import { fetchPosproKpiForUser, type PosproStaffKpi } from "@/lib/services/pospro/client";

/** Status yang berarti karyawan tidak masuk dengan keterangan. */
const LEAVE_STATUSES = new Set(["Izin", "Sakit", "Cuti"]);

export type PortalAttendanceRow = {
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  status: string;
  shift: string | null;
  lateMinutes: number;
  overtimeMinutes: number;
  isHoliday: boolean;
  absenceReason: string | null;
};

export type PortalAttendanceSummary = {
  /** Hari dengan scan masuk/pulang. */
  present: number;
  onTime: number;
  late: number;
  longshift: number;
  /** Hari tanpa scan & tanpa keterangan. */
  absent: number;
  /** Hari Izin/Sakit/Cuti. */
  leave: number;
  holiday: number;
  totalLateMinutes: number;
  totalOvertimeMinutes: number;
  /** Persentase kehadiran terhadap hari kerja (bukan libur), 0–100. */
  attendanceRate: number;
};

export type PortalScore = {
  indicator: string;
  category: string;
  weight: number;
  score: number;
  weightedValue: number;
  notes: string | null;
};

export type PortalAssessment = {
  id: number;
  date: string;
  period: string | null;
  totalScore: number;
  grade: string | null;
  template: string;
  evaluatorNotes: string | null;
  developmentPlan: string | null;
  recommendation: string | null;
  scores: PortalScore[];
};

export type PortalOverview = {
  period: { label: string; startStr: string; endStr: string; year: number; month: number };
  attendance: { summary: PortalAttendanceSummary; rows: PortalAttendanceRow[] };
  /** Estimasi lembur/uang makan periode ini (struk). */
  receipt: ReceiptData | null;
  assessment: {
    latest: PortalAssessment | null;
    history: { id: number; date: string; totalScore: number; grade: string | null; period: string | null }[];
    average: number;
  };
  publicFeedback: {
    average: number;
    count: number;
    items: { id: number; date: string; stars: number; raterName: string | null; comment: string | null }[];
  };
  /**
   * KPI dari PosPro (kasir) bila karyawan sudah dipetakan & PosPro bisa dihubungi.
   * null = belum dipetakan, integrasi mati, atau PosPro sedang tak bisa dihubungi —
   * halaman tetap tampil tanpa bagian ini.
   */
  pospro: PosproStaffKpi | null;
};

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Ringkas baris laporan absensi menjadi angka-angka kartu portal. */
export function summarizeRows(rows: PortalAttendanceRow[]): PortalAttendanceSummary {
  const present = rows.filter((r) => r.clockIn || r.clockOut).length;
  const leave = rows.filter((r) => LEAVE_STATUSES.has(r.status)).length;
  const holiday = rows.filter((r) => r.status === "holiday").length;
  const absent = rows.filter((r) => r.status === "absent").length;
  const workDays = rows.length - holiday;
  return {
    present,
    onTime: rows.filter((r) => r.status === "on_time").length,
    late: rows.filter((r) => r.status === "late").length,
    longshift: rows.filter((r) => r.status === "longshift").length,
    absent,
    leave,
    holiday,
    totalLateMinutes: rows.reduce((s, r) => s + r.lateMinutes, 0),
    totalOvertimeMinutes: rows.reduce((s, r) => s + r.overtimeMinutes, 0),
    attendanceRate: workDays > 0 ? Math.round((present / workDays) * 100) : 0,
  };
}

/**
 * Semua data satu karyawan untuk satu periode: absensi, struk lembur,
 * penilaian kinerja, dan feedback publik. Dipakai halaman portal /me/[token].
 */
export async function buildPortalOverview(
  prisma: PrismaClient,
  employeeId: number,
  period: ReceiptPeriod,
  posproUserId: number | null = null
): Promise<PortalOverview> {
  const [attendance, receipt, assessments, publicAgg, publicItems, pospro] = await Promise.all([
    aggregateAttendance(prisma, {
      startStr: period.startStr,
      endStr: period.endStr,
      employeeId: String(employeeId),
    }),
    buildEmployeeReceipt(prisma, employeeId, period),
    prisma.assessment.findMany({
      where: { employeeId, deletedAt: null, isPublic: false, status: { in: ["completed", "approved"] } },
      orderBy: { assessmentDate: "desc" },
      take: 12,
      include: {
        template: { select: { name: true } },
        scores: { include: { indicator: true }, orderBy: { id: "asc" } },
      },
    }),
    prisma.assessment.aggregate({
      where: { employeeId, deletedAt: null, isPublic: true },
      _avg: { totalScore: true },
      _count: true,
    }),
    prisma.assessment.findMany({
      where: { employeeId, deletedAt: null, isPublic: true },
      orderBy: { assessmentDate: "desc" },
      take: 5,
      select: { id: true, totalScore: true, raterName: true, evaluatorNotes: true, assessmentDate: true },
    }),
    fetchPosproKpiForUser(posproUserId, period.startStr, period.endStr),
  ]);

  const rows: PortalAttendanceRow[] = attendance.rows.map((r) => ({
    date: r.date,
    clockIn: r.clockIn,
    clockOut: r.clockOut,
    status: r.status,
    shift: r.shift,
    lateMinutes: r.lateMinutes,
    overtimeMinutes: r.overtimeMinutes,
    isHoliday: r.isHoliday,
    absenceReason: r.absenceReason,
  }));

  const latestRaw = assessments[0] ?? null;
  const latest: PortalAssessment | null = latestRaw
    ? {
        id: latestRaw.id,
        date: ymd(latestRaw.assessmentDate),
        period: latestRaw.period,
        totalScore: Number(latestRaw.totalScore ?? 0),
        grade: latestRaw.grade,
        template: latestRaw.template.name,
        evaluatorNotes: latestRaw.evaluatorNotes,
        developmentPlan: latestRaw.developmentPlan,
        recommendation: latestRaw.recommendation,
        scores: latestRaw.scores.map((s) => ({
          indicator: s.indicator.name,
          category: s.indicator.category,
          weight: Number(s.indicator.weight),
          score: s.score,
          weightedValue: Number(s.weightedValue),
          notes: s.notes,
        })),
      }
    : null;

  const history = assessments
    .map((a) => ({
      id: a.id,
      date: ymd(a.assessmentDate),
      totalScore: Number(a.totalScore ?? 0),
      grade: a.grade,
      period: a.period,
    }))
    .reverse(); // urut lama -> baru untuk grafik tren

  const average = history.length
    ? round2(history.reduce((s, h) => s + h.totalScore, 0) / history.length)
    : 0;

  return {
    period: {
      label: period.label,
      startStr: period.startStr,
      endStr: period.endStr,
      year: period.year,
      month: period.month,
    },
    attendance: { summary: summarizeRows(rows), rows },
    receipt,
    assessment: { latest, history, average },
    publicFeedback: {
      average: publicAgg._avg.totalScore ? round2(Number(publicAgg._avg.totalScore)) : 0,
      count: publicAgg._count,
      items: publicItems.map((p) => ({
        id: p.id,
        date: ymd(p.assessmentDate),
        stars: Number(p.totalScore ?? 0),
        raterName: p.raterName,
        comment: p.evaluatorNotes,
      })),
    },
    pospro,
  };
}
