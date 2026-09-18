import type { PrismaClient } from "@prisma/client";
import { aggregateAttendance } from "@/lib/services/attendance/aggregate";
import { fetchPosproDaily } from "@/lib/services/pospro/client";
import { getAllSettings } from "@/lib/settings";
import { resolvePointRates, pointsEnabled, type PointRates } from "./rates";
import { computeDayPoints, sumPoints, type DayActivity, type PointBreakdown } from "./compute";

export type PointDay = {
  date: string;
  omzet: number;
  transactions: number;
  designJobs: number;
  operatorJobs: number;
  tasksOnTime: number;
  tasksLate: number;
  onTime: boolean;
  omzetPoints: number;
  jobPoints: number;
  taskPoints: number;
  attendancePoints: number;
  points: number;
};

export type PointPeriod = {
  days: PointDay[];
  breakdown: PointBreakdown;
  rates: PointRates;
};

function atMidnight(ymd: string): Date {
  return new Date(`${ymd}T00:00:00`);
}

/**
 * Hitung ulang poin satu karyawan untuk satu rentang, lalu simpan ke PointEntry.
 *
 * Idempoten: menjalankan ulang untuk rentang yang sama menimpa hasil lama, bukan
 * menggandakannya. Hari tanpa aktivitas apa pun tidak disimpan agar tabel tetap ramping.
 */
export async function recomputePoints(
  prisma: PrismaClient,
  employee: { id: number; posproUserId: number | null },
  startStr: string,
  endStr: string
): Promise<PointPeriod> {
  const settings = await getAllSettings();
  const rates = resolvePointRates(settings);

  const [attendance, daily] = await Promise.all([
    aggregateAttendance(prisma, {
      startStr,
      endStr,
      employeeId: String(employee.id),
    }),
    fetchPosproDaily(employee.posproUserId, startStr, endStr),
  ]);

  const outputByDate = new Map((daily?.days ?? []).map((d) => [d.date, d]));
  // Hari yang punya aktivitas: hari absensi, plus hari yang ada hasil kerja di PosPro.
  const dates = new Set<string>([
    ...attendance.rows.map((r) => r.date),
    ...outputByDate.keys(),
  ]);
  const attendanceByDate = new Map(attendance.rows.map((r) => [r.date, r]));

  const days: PointDay[] = [];
  for (const date of [...dates].sort()) {
    const att = attendanceByDate.get(date);
    const out = outputByDate.get(date);
    const activity: DayActivity = {
      date,
      omzet: out?.totalOmzet ?? 0,
      transactions: out?.transactions ?? 0,
      designJobs: out?.designJobs ?? 0,
      operatorJobs: out?.operatorJobs ?? 0,
      tasksOnTime: out?.tasksOnTime ?? 0,
      tasksLate: out?.tasksLate ?? 0,
      onTime: Boolean(att?.clockIn) && (att?.lateMinutes ?? 0) === 0,
    };
    const p = computeDayPoints(activity, rates);
    days.push({ ...activity, ...p, points: p.total });
  }

  const withPoints = days.filter((d) => d.points > 0);

  // Tulis ulang rentang ini: buang yang lama, simpan yang baru.
  await prisma.pointEntry.deleteMany({
    where: {
      employeeId: employee.id,
      date: { gte: atMidnight(startStr), lte: atMidnight(endStr) },
    },
  });
  if (withPoints.length > 0) {
    await prisma.pointEntry.createMany({
      data: withPoints.map((d) => ({
        employeeId: employee.id,
        date: atMidnight(d.date),
        omzet: d.omzet,
        omzetPoints: d.omzetPoints,
        jobPoints: d.jobPoints,
        taskPoints: d.taskPoints,
        attendancePoints: d.attendancePoints,
        points: d.points,
      })),
    });
  }

  return {
    days,
    breakdown: sumPoints(
      days.map((d) => ({
        date: d.date,
        omzetPoints: d.omzetPoints,
        jobPoints: d.jobPoints,
        taskPoints: d.taskPoints,
        attendancePoints: d.attendancePoints,
        total: d.points,
      }))
    ),
    rates,
  };
}

export type PointBalance = {
  /** Seluruh poin yang pernah didapat. */
  earned: number;
  /** Poin yang sudah terpakai (penukaran disetujui / diserahkan). */
  redeemed: number;
  /** Poin pada pengajuan yang masih menunggu keputusan owner. */
  pending: number;
  /** Siap dipakai: earned - redeemed - pending. */
  available: number;
};

/** Saldo poin karyawan dari seluruh riwayat. */
export async function pointBalance(
  prisma: PrismaClient,
  employeeId: number
): Promise<PointBalance> {
  const [earnedAgg, redeemedAgg, pendingAgg] = await Promise.all([
    prisma.pointEntry.aggregate({ where: { employeeId }, _sum: { points: true } }),
    prisma.pointRedemption.aggregate({
      where: { employeeId, status: { in: ["approved", "delivered"] } },
      _sum: { pointCost: true },
    }),
    prisma.pointRedemption.aggregate({
      where: { employeeId, status: "pending" },
      _sum: { pointCost: true },
    }),
  ]);

  const earned = earnedAgg._sum.points ?? 0;
  const redeemed = redeemedAgg._sum.pointCost ?? 0;
  const pending = pendingAgg._sum.pointCost ?? 0;
  return { earned, redeemed, pending, available: earned - redeemed - pending };
}

/** True bila sistem poin sedang dinyalakan. */
export async function isPointsEnabled(): Promise<boolean> {
  return pointsEnabled(await getAllSettings());
}

export type LeaderboardRow = {
  employeeId: number;
  fullName: string;
  department: string | null;
  points: number;
  omzet: number;
  days: number;
};

/** Papan peringkat poin untuk owner pada satu rentang. */
export async function pointLeaderboard(
  prisma: PrismaClient,
  startStr: string,
  endStr: string
): Promise<LeaderboardRow[]> {
  const grouped = await prisma.pointEntry.groupBy({
    by: ["employeeId"],
    where: { date: { gte: atMidnight(startStr), lte: atMidnight(endStr) } },
    _sum: { points: true, omzet: true },
    _count: { _all: true },
  });
  if (grouped.length === 0) return [];

  const employees = await prisma.employee.findMany({
    where: { id: { in: grouped.map((g) => g.employeeId) } },
    select: { id: true, fullName: true, department: { select: { name: true } } },
  });
  const byId = new Map(employees.map((e) => [e.id, e]));

  return grouped
    .map((g) => ({
      employeeId: g.employeeId,
      fullName: byId.get(g.employeeId)?.fullName ?? "—",
      department: byId.get(g.employeeId)?.department?.name ?? null,
      points: g._sum.points ?? 0,
      omzet: Number(g._sum.omzet ?? 0),
      days: g._count._all,
    }))
    .sort((a, b) => b.points - a.points);
}
