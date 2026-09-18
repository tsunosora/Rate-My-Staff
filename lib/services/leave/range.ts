/**
 * Aturan rentang tanggal pengajuan izin/sakit/cuti. Modul murni (tanpa Prisma)
 * agar bisa diuji langsung & dipakai dari route publik maupun dashboard.
 */

/** Maksimal hari dalam satu pengajuan (cuti panjang dipecah jadi beberapa pengajuan). */
export const MAX_LEAVE_DAYS = 31;

/** Sakit boleh dilaporkan mundur; batas mundurnya (hari) dari hari ini. */
export const MAX_BACKDATE_DAYS = 30;

/** Batas maju pengajuan (hari) — cegah salah ketik tahun. */
export const MAX_FUTURE_DAYS = 365;

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "YYYY-MM-DD" -> jumlah hari sejak epoch (UTC, bebas zona waktu). */
export function dayNumber(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
}

/** Kebalikan dayNumber. */
export function fromDayNumber(n: number): string {
  const d = new Date(n * 86400000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
}

/** Semua tanggal dalam rentang (inklusif), urut naik. */
export function expandDates(startStr: string, endStr: string): string[] {
  const start = dayNumber(startStr);
  const end = dayNumber(endStr);
  if (end < start) return [];
  const out: string[] = [];
  for (let n = start; n <= end; n++) out.push(fromDayNumber(n));
  return out;
}

/** Jumlah hari dalam rentang (inklusif). 0 bila terbalik. */
export function countDays(startStr: string, endStr: string): number {
  const n = dayNumber(endStr) - dayNumber(startStr) + 1;
  return n > 0 ? n : 0;
}

/** True bila dua rentang tanggal (inklusif) beririsan. */
export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  return dayNumber(aStart) <= dayNumber(bEnd) && dayNumber(bStart) <= dayNumber(aEnd);
}

export type LeaveRangeCheck = { ok: true } | { ok: false; error: string };

/**
 * Validasi rentang pengajuan terhadap hari ini (`todayStr`, "YYYY-MM-DD").
 * Pesan kesalahan siap tampil ke karyawan.
 */
export function validateLeaveRange(
  startStr: string,
  endStr: string,
  todayStr: string
): LeaveRangeCheck {
  if (!YMD_RE.test(startStr) || !YMD_RE.test(endStr)) {
    return { ok: false, error: "Format tanggal tidak valid." };
  }
  const start = dayNumber(startStr);
  const end = dayNumber(endStr);
  const today = dayNumber(todayStr);

  if (end < start) return { ok: false, error: "Tanggal selesai mendahului tanggal mulai." };
  if (end - start + 1 > MAX_LEAVE_DAYS) {
    return { ok: false, error: `Maksimal ${MAX_LEAVE_DAYS} hari per pengajuan.` };
  }
  if (today - start > MAX_BACKDATE_DAYS) {
    return { ok: false, error: `Tanggal mundur lebih dari ${MAX_BACKDATE_DAYS} hari — hubungi admin.` };
  }
  if (start - today > MAX_FUTURE_DAYS) {
    return { ok: false, error: "Tanggal terlalu jauh di depan — periksa lagi tahunnya." };
  }
  return { ok: true };
}
