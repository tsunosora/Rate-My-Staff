import type { ReportRow } from "./report";
import { DEFAULT_RECEIPT_LABELS, type ReceiptLabelSet } from "./receipt-rates";

export type { ReceiptLabelSet };

export type ReceiptRateSet = {
  /** Lembur Harian: per hari longshift (acuan 20000). */
  daily: number;
  /** Lembur Libur: per hari libur yang tetap masuk (acuan 70000). */
  holiday: number;
  /** Lembur Cetak: per jam lembur di atas jam tutup shift siang/longshift (acuan 10000). */
  cetak: number;
};

/**
 * Kebijakan pembulatan jam lembur:
 * - "hour"    : hanya jam PENUH yang dihitung; sisa menit (<60) dibuang. 50m=0, 90m=1, 130m=2.
 * - "decimal" : jam desimal apa adanya (menit/60, 2 desimal). 50m=0.83, 90m=1.5.
 */
export type OvertimeRounding = "hour" | "decimal";

/** Ubah menit lembur menjadi jam sesuai kebijakan pembulatan. */
export function billableOvertimeHours(minutes: number, rounding: OvertimeRounding): number {
  if (minutes <= 0) return 0;
  if (rounding === "decimal") return Math.round((minutes / 60) * 100) / 100;
  return Math.floor(minutes / 60);
}

/** Format menit -> "Xj Ym" (210 -> "3j 30m", 180 -> "3j", 30 -> "30m", 0 -> "0m"). */
export function formatHoursMinutes(min: number): string {
  const total = Math.max(0, Math.round(min));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h && m) return `${h}j ${m}m`;
  if (h) return `${h}j`;
  return `${m}m`;
}

export type ReceiptInputRow = Pick<
  ReportRow,
  "date" | "shift" | "isHoliday" | "clockIn" | "clockOut" | "lateMinutes" | "overtimeMinutes" | "status"
> & {
  /** Mode flexible: hari ini berhak uang makan (durasi di atas 10 jam). */
  mealEligible?: boolean;
  /** Mode flexible: menit kekurangan jam bila durasi di bawah 8 jam. */
  undertimeMinutes?: number;
  /** Mode flexible: durasi kerja kotor (menit) — untuk lembur hari libur (semua jam dihitung). */
  workedMinutes?: number;
};

export type ReceiptInput = {
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  department: string | null;
  year: number; // mis. 2026
  month: number; // 1-12
  /** Label periode tampil (mis. "April 2026" atau "06–12 Apr 2026"). Default: bulan+tahun. */
  periodLabel?: string;
  rates: ReceiptRateSet;
  /** Kebijakan pembulatan lembur (default "hour" = hanya jam penuh). Diabaikan di mode flexible. */
  rounding?: OvertimeRounding;
  /** Mode "jam masuk bebas": lembur per-menit dari durasi + uang makan (bukan LS/LC/LL). */
  flexible?: boolean;
  /** Tarif lembur per jam (dari jadwal karyawan) — dipakai hanya di mode flexible. */
  flexRatePerHour?: number;
  /**
   * Mode flexible: tarif lembur HARI LIBUR per jam. Di hari libur SEMUA jam kerja dihitung
   * (bukan hanya di atas 8 jam). Bila tak diisi, jatuh ke `flexRatePerHour`.
   */
  flexHolidayRatePerHour?: number;
  /** Nominal uang makan flat per hari di atas 10 jam — dipakai hanya di mode flexible. */
  mealAllowance?: number;
  /** Label istilah pembayaran (bisa diganti dari Pengaturan). Default DEFAULT_RECEIPT_LABELS. */
  labels?: ReceiptLabelSet;
  rows: ReceiptInputRow[];
};

export type ReceiptDayRow = {
  date: string;
  dayName: string;
  isHoliday: boolean;
  clockIn: string | null;
  clockOut: string | null;
  shiftLabel: string; // "Long" | "Pagi" | "Siang" | "—"
  lateMinutes: number;
  overtimeHours: number; // overtimeMinutes/60, 2 desimal (kolom Keterangan>Lembur)
  /** Mode flexible: menit lembur mentah hari kerja (di atas 8 jam); 0 di hari libur. */
  overtimeMinutes: number;
  /** Mode flexible: menit lembur HARI LIBUR (seluruh durasi kerja); 0 di hari kerja. */
  holidayOvertimeMinutes: number;
  ls: number; // 0 | 1
  lc: number; // jam, 2 desimal
  ll: number; // 0 | 1
  /** Mode flexible: hari ini berhak uang makan (durasi di atas 10 jam). */
  mealEligible: boolean;
  /** Mode flexible: menit kekurangan jam (durasi di bawah 8 jam). */
  undertimeMinutes: number;
  worked: boolean;
};

export type ReceiptData = {
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  department: string | null;
  year: number;
  month: number;
  monthLabel: string; // "April 2026"
  /** True bila struk ini memakai mode flexible (lembur durasi + uang makan). */
  flexible: boolean;
  /** Mode flexible: tarif lembur per jam (dari jadwal). 0 di mode fixed. */
  flexRatePerHour: number;
  /** Mode flexible: tarif lembur hari libur per jam (efektif, setelah fallback). 0 di mode fixed. */
  flexHolidayRatePerHour: number;
  /** Mode flexible: nominal uang makan flat per hari. 0 di mode fixed. */
  mealAllowance: number;
  /** Label istilah pembayaran (hasil resolusi Setting; dipakai UI/PDF/Excel). */
  labels: ReceiptLabelSet;
  rows: ReceiptDayRow[];
  totals: {
    lsCount: number;
    lcHours: number;
    llCount: number;
    dailyAmount: number;
    holidayAmount: number;
    cetakAmount: number;
    /** Mode flexible: total menit lembur hari KERJA sebulan (di atas 8 jam). */
    overtimeMinutes: number;
    /** Mode flexible: rupiah lembur hari kerja (per-menit dari total menit). */
    overtimeAmount: number;
    /** Mode flexible: total menit lembur HARI LIBUR sebulan (seluruh durasi kerja di hari libur). */
    holidayOvertimeMinutes: number;
    /** Mode flexible: rupiah lembur hari libur (per-menit × tarif libur). */
    holidayOvertimeAmount: number;
    /** Mode flexible: jumlah hari berhak uang makan. */
    mealCount: number;
    /** Mode flexible: rupiah uang makan (mealCount × nominal). */
    mealAmount: number;
    /** Mode flexible: total menit kekurangan jam sebulan (informasional). */
    undertimeMinutes: number;
    grandTotal: number;
  };
  rates: ReceiptRateSet;
};

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const SHIFT_LABEL: Record<string, string> = { longshift: "Long", pagi: "Pagi", siang: "Siang" };

/**
 * Ubah baris absensi satu bulan-satu karyawan menjadi struk (ReceiptData).
 * Aturan (dikonfirmasi user):
 * - LS = 1 bila shift longshift di hari kerja & hadir -> "Lembur Harian".
 * - LL = 1 bila hari libur tapi tetap hadir (8 jam = 1 hari) -> "Lembur Libur".
 * - LC = jam lembur hanya shift siang/longshift di hari kerja -> "Lembur Cetak".
 * Jam lembur dibulatkan menurut `rounding` (default "hour": sisa menit <60 tidak dihitung).
 */
export function buildReceipt(input: ReceiptInput): ReceiptData {
  const flexible = Boolean(input.flexible);
  const rounding: OvertimeRounding = input.rounding ?? "hour";
  const rows: ReceiptDayRow[] = input.rows.map((r) => {
    const worked = Boolean(r.clockIn || r.clockOut);
    // Mode flexible selalu per-menit (desimal) demi keadilan; abaikan kebijakan "hour".
    const otHours = flexible
      ? billableOvertimeHours(r.overtimeMinutes, "decimal")
      : billableOvertimeHours(r.overtimeMinutes, rounding);
    // LS/LC/LL adalah konsep shift — tak berlaku di mode flexible.
    const ls = !flexible && worked && !r.isHoliday && r.shift === "longshift" ? 1 : 0;
    const ll = !flexible && worked && r.isHoliday ? 1 : 0;
    const lc =
      !flexible && worked && !r.isHoliday && (r.shift === "siang" || r.shift === "longshift") ? otHours : 0;
    const mealEligible = flexible && worked && Boolean(r.mealEligible);
    // Hari libur (mode flexible): seluruh durasi kerja jadi lembur libur — lembur biasa &
    // kekurangan jam tak berlaku. workedMinutes 0 bila scan tak lengkap (dari computeFlexible).
    const holidayOvertimeMinutes = flexible && r.isHoliday ? Math.max(0, r.workedMinutes ?? 0) : 0;
    const overtimeMinutes = flexible && r.isHoliday ? 0 : Math.max(0, r.overtimeMinutes);
    const undertimeMinutes = flexible && !r.isHoliday ? Math.max(0, r.undertimeMinutes ?? 0) : 0;
    const [y, m, d] = r.date.split("-").map(Number);
    const dayName = DAY_NAMES[new Date(y, m - 1, d).getDay()];
    return {
      date: r.date,
      dayName,
      isHoliday: r.isHoliday,
      clockIn: r.clockIn,
      clockOut: r.clockOut,
      shiftLabel: flexible ? "Bebas" : r.shift ? SHIFT_LABEL[r.shift] ?? "—" : "—",
      lateMinutes: r.lateMinutes,
      overtimeHours: otHours,
      overtimeMinutes,
      holidayOvertimeMinutes,
      ls,
      lc,
      ll,
      mealEligible,
      undertimeMinutes,
      worked,
    };
  });

  const lsCount = rows.reduce((s, r) => s + r.ls, 0);
  const llCount = rows.reduce((s, r) => s + r.ll, 0);
  const lcHours = Math.round(rows.reduce((s, r) => s + r.lc, 0) * 100) / 100;
  const dailyAmount = lsCount * input.rates.daily;
  const holidayAmount = llCount * input.rates.holiday;
  const cetakAmount = Math.round(lcHours * input.rates.cetak);

  // Mode flexible: jumlahkan menit dulu baru dikonversi (hindari galat pembulatan harian).
  // Lembur hari kerja hanya dari hari NON-libur; hari libur dihitung terpisah (semua jam).
  const flexRate = input.flexRatePerHour ?? 0;
  const flexHolidayRate = input.flexHolidayRatePerHour ?? flexRate;
  const overtimeMinutes = flexible
    ? input.rows.reduce((s, r) => s + (r.isHoliday ? 0 : Math.max(0, r.overtimeMinutes)), 0)
    : 0;
  const overtimeAmount = flexible ? Math.round((overtimeMinutes / 60) * flexRate) : 0;
  const holidayOvertimeMinutes = flexible
    ? input.rows.reduce((s, r) => s + (r.isHoliday ? Math.max(0, r.workedMinutes ?? 0) : 0), 0)
    : 0;
  const holidayOvertimeAmount = flexible
    ? Math.round((holidayOvertimeMinutes / 60) * flexHolidayRate)
    : 0;
  const mealCount = rows.reduce((s, r) => s + (r.mealEligible ? 1 : 0), 0);
  const mealAmount = flexible ? mealCount * (input.mealAllowance ?? 0) : 0;
  const undertimeMinutes = rows.reduce((s, r) => s + r.undertimeMinutes, 0);

  const grandTotal = flexible
    ? overtimeAmount + holidayOvertimeAmount + mealAmount
    : dailyAmount + holidayAmount + cetakAmount;

  return {
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    employeeCode: input.employeeCode,
    department: input.department,
    year: input.year,
    month: input.month,
    monthLabel: input.periodLabel ?? `${MONTHS[input.month - 1]} ${input.year}`,
    flexible,
    flexRatePerHour: flexible ? flexRate : 0,
    flexHolidayRatePerHour: flexible ? flexHolidayRate : 0,
    mealAllowance: flexible ? input.mealAllowance ?? 0 : 0,
    labels: input.labels ?? DEFAULT_RECEIPT_LABELS,
    rows,
    totals: {
      lsCount,
      lcHours,
      llCount,
      dailyAmount,
      holidayAmount,
      cetakAmount,
      overtimeMinutes,
      overtimeAmount,
      holidayOvertimeMinutes,
      holidayOvertimeAmount,
      mealCount,
      mealAmount,
      undertimeMinutes,
      grandTotal,
    },
    rates: input.rates,
  };
}
