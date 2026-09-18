/**
 * Hitungan jam kerja & tren kedisiplinan untuk grafik di halaman karyawan.
 * Modul murni (tanpa Prisma) agar bisa diuji langsung.
 */

/** "HH:MM" -> menit sejak tengah malam; null bila bukan jam yang sah. */
export function toMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Durasi kerja satu hari dalam menit dari jam masuk & pulang.
 * Pulang lebih kecil dari masuk dianggap lewat tengah malam (shift malam).
 * 0 bila salah satu jam tidak ada — durasi tak bisa dikarang.
 */
export function workedMinutesOf(
  clockIn: string | null | undefined,
  clockOut: string | null | undefined
): number {
  const start = toMinutes(clockIn);
  const end = toMinutes(clockOut);
  if (start === null || end === null) return 0;
  const diff = end >= start ? end - start : end + 24 * 60 - start;
  // Lebih dari 16 jam hampir pasti salah data (lupa absen pulang lalu scan besoknya).
  return diff > 16 * 60 ? 0 : diff;
}

export type DisciplineSummary = {
  /** Hari dengan scan masuk. */
  workedDays: number;
  totalWorkedMinutes: number;
  avgWorkedMinutes: number;
  lateDays: number;
  totalLateMinutes: number;
  /** Rata-rata menit telat per hari kerja (bukan per hari telat). */
  avgLateMinutes: number;
  onTimeRate: number; // 0-100
};

export type DisciplineInput = {
  clockIn: string | null;
  lateMinutes: number;
  workedMinutes: number;
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Ringkas kedisiplinan satu periode. */
export function summarizeDiscipline(rows: DisciplineInput[]): DisciplineSummary {
  const worked = rows.filter((r) => r.clockIn);
  const workedDays = worked.length;
  const totalWorkedMinutes = worked.reduce((s, r) => s + r.workedMinutes, 0);
  const lateDays = worked.filter((r) => r.lateMinutes > 0).length;
  const totalLateMinutes = worked.reduce((s, r) => s + r.lateMinutes, 0);

  return {
    workedDays,
    totalWorkedMinutes,
    avgWorkedMinutes: workedDays ? Math.round(totalWorkedMinutes / workedDays) : 0,
    lateDays,
    totalLateMinutes,
    avgLateMinutes: workedDays ? round1(totalLateMinutes / workedDays) : 0,
    onTimeRate: workedDays ? Math.round(((workedDays - lateDays) / workedDays) * 100) : 0,
  };
}

export type Trend = "membaik" | "memburuk" | "sama" | "baru";

export type DisciplineComparison = {
  current: DisciplineSummary;
  previous: DisciplineSummary;
  /** Selisih rata-rata telat (menit). Negatif = lebih tertib dari periode lalu. */
  lateDelta: number;
  /** Selisih persentase tepat waktu. Positif = membaik. */
  onTimeDelta: number;
  /** Selisih rata-rata jam kerja (menit). */
  workedDelta: number;
  trend: Trend;
};

/**
 * Bandingkan periode berjalan dengan periode sebelumnya.
 * `trend` memakai rata-rata menit telat: turun = membaik, naik = memburuk.
 * Selisih di bawah 1 menit dianggap sama agar tidak terasa naik-turun tanpa makna.
 */
export function compareDiscipline(
  current: DisciplineSummary,
  previous: DisciplineSummary
): DisciplineComparison {
  const lateDelta = round1(current.avgLateMinutes - previous.avgLateMinutes);
  const onTimeDelta = current.onTimeRate - previous.onTimeRate;
  const workedDelta = current.avgWorkedMinutes - previous.avgWorkedMinutes;

  let trend: Trend;
  if (previous.workedDays === 0) trend = "baru";
  else if (Math.abs(lateDelta) < 1) trend = "sama";
  else trend = lateDelta < 0 ? "membaik" : "memburuk";

  return { current, previous, lateDelta, onTimeDelta, workedDelta, trend };
}

/** Rentang periode sebelumnya: sama panjangnya, berakhir sehari sebelum `startStr`. */
export function previousRange(
  startStr: string,
  endStr: string
): { startStr: string; endStr: string } {
  const day = 86400000;
  const start = new Date(`${startStr}T00:00:00`);
  const end = new Date(`${endStr}T00:00:00`);
  const days = Math.round((end.getTime() - start.getTime()) / day) + 1;
  const prevEnd = new Date(start.getTime() - day);
  const prevStart = new Date(prevEnd.getTime() - (days - 1) * day);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { startStr: fmt(prevStart), endStr: fmt(prevEnd) };
}
