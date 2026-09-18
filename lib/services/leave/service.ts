import type { PrismaClient, LeaveRequest } from "@prisma/client";
import { expandDates, rangesOverlap } from "./range";

/** Jenis ketidakhadiran yang dikenali laporan absensi (lihat ABSENCE_STATUSES di report.ts). */
export const LEAVE_TYPES = ["Izin", "Sakit", "Cuti"] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

/** Penanda baris Attendance yang lahir dari persetujuan izin — dipakai saat pembatalan. */
export const LEAVE_MACHINE_NAME = "leave-approval";

/** Date lokal tengah malam dari "YYYY-MM-DD" (seragam dengan modul absensi lain). */
export function atMidnight(ymd: string): Date {
  return new Date(`${ymd}T00:00:00`);
}

/** Date lokal -> "YYYY-MM-DD". */
export function toYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

/**
 * Cari pengajuan aktif (pending/approved) milik karyawan yang beririsan tanggalnya.
 * Dipakai agar satu hari tidak punya dua pengajuan sekaligus.
 */
export async function findOverlapping(
  prisma: PrismaClient,
  employeeId: number,
  startStr: string,
  endStr: string,
  ignoreId?: number
): Promise<LeaveRequest | null> {
  const candidates = await prisma.leaveRequest.findMany({
    where: {
      employeeId,
      status: { in: ["pending", "approved"] },
      ...(ignoreId ? { id: { not: ignoreId } } : {}),
      // Saring kasar di DB, irisan persisnya dihitung di bawah (bebas zona waktu).
      startDate: { lte: new Date(`${endStr}T23:59:59`) },
      endDate: { gte: new Date(`${startStr}T00:00:00`) },
    },
    orderBy: { startDate: "asc" },
  });
  return (
    candidates.find((c) => rangesOverlap(startStr, endStr, toYmd(c.startDate), toYmd(c.endDate))) ??
    null
  );
}

export type ApplyResult = {
  /** Jumlah hari yang tercatat sebagai ketidakhadiran. */
  applied: number;
  /** Tanggal yang dilewati karena sudah ada scan mesin/manual (bukti kehadiran tak dihapus). */
  skipped: string[];
};

/**
 * Tuangkan pengajuan yang DISETUJUI ke tabel Attendance (satu baris per hari).
 * Hari yang sudah punya scan nyata dilewati — data absensi asli tidak pernah ditimpa.
 */
export async function applyApprovedLeave(
  prisma: PrismaClient,
  request: Pick<LeaveRequest, "id" | "employeeId" | "startDate" | "endDate" | "type" | "reason">
): Promise<ApplyResult> {
  const dates = expandDates(toYmd(request.startDate), toYmd(request.endDate));
  const skipped: string[] = [];
  let applied = 0;

  for (const date of dates) {
    const start = atMidnight(date);
    const end = new Date(start.getTime() + 86400000);
    const existing = await prisma.attendance.findMany({
      where: { employeeId: request.employeeId, scanDate: { gte: start, lt: end } },
      select: { id: true, scanType: true },
    });

    const realScans = existing.filter((a) => a.scanType !== "absence");
    if (realScans.length > 0) {
      skipped.push(date);
      continue;
    }

    // Sisa baris hanyalah catatan ketidakhadiran lama — aman diganti.
    if (existing.length > 0) {
      await prisma.attendance.deleteMany({ where: { id: { in: existing.map((a) => a.id) } } });
    }
    await prisma.attendance.create({
      data: {
        employeeId: request.employeeId,
        scanDate: start,
        scanType: "absence",
        status: request.type,
        absenceReason: request.reason,
        machineName: LEAVE_MACHINE_NAME,
      },
    });
    applied++;
  }

  return { applied, skipped };
}

/**
 * Tarik kembali baris Attendance yang dibuat oleh persetujuan (saat izin dibatalkan).
 * Hanya menghapus baris bertanda LEAVE_MACHINE_NAME — scan mesin tidak tersentuh.
 */
export async function revertApprovedLeave(
  prisma: PrismaClient,
  request: Pick<LeaveRequest, "employeeId" | "startDate" | "endDate">
): Promise<number> {
  const start = atMidnight(toYmd(request.startDate));
  const end = new Date(atMidnight(toYmd(request.endDate)).getTime() + 86400000);
  const res = await prisma.attendance.deleteMany({
    where: {
      employeeId: request.employeeId,
      scanDate: { gte: start, lt: end },
      scanType: "absence",
      machineName: LEAVE_MACHINE_NAME,
    },
  });
  return res.count;
}

/**
 * Isi notifikasi untuk owner/manajemen saat pengajuan masuk.
 * `title`/`message` dipakai NotificationBell; sisanya untuk penautan di kemudian hari.
 */
export function leaveNotificationData(input: {
  leaveRequestId: number;
  employeeId: number;
  employeeName: string;
  type: string;
  startStr: string;
  endStr: string;
}) {
  const range =
    input.startStr === input.endStr ? input.startStr : `${input.startStr} s/d ${input.endStr}`;
  return {
    title: "Pengajuan izin baru",
    message: `${input.employeeName} — ${input.type}, ${range}`,
    leaveRequestId: input.leaveRequestId,
    employeeId: input.employeeId,
    type: input.type,
    startDate: input.startStr,
    endDate: input.endStr,
  };
}
