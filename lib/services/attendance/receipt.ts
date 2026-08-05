import type { ReportRow } from "./report";

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

export type ReceiptInputRow = Pick<
  ReportRow,
  "date" | "shift" | "isHoliday" | "clockIn" | "clockOut" | "lateMinutes" | "overtimeMinutes" | "status"
> & {
  /** Mode flexible: hari ini berhak uang makan (durasi di atas 10 jam). */
  mealEligible?: boolean;
};

export type ReceiptInput = {
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  department: string | null;
  year: number; // mis. 2026
  month: number; // 1-12
  rates: ReceiptRateSet;
  /** Kebijakan pembulatan lembur (default "hour" = hanya jam penuh). Diabaikan di mode flexible. */
  rounding?: OvertimeRounding;
  /** Mode "jam masuk bebas": lembur per-menit dari durasi + uang makan (bukan LS/LC/LL). */
  flexible?: boolean;
  /** Tarif lembur per jam (dari jadwal karyawan) — dipakai hanya di mode flexible. */
  flexRatePerHour?: number;
  /** Nominal uang makan flat per hari di atas 10 jam — dipakai hanya di mode flexible. */
  mealAllowance?: number;
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
  ls: number; // 0 | 1
  lc: number; // jam, 2 desimal
  ll: number; // 0 | 1
  /** Mode flexible: hari ini berhak uang makan (durasi di atas 10 jam). */
  mealEligible: boolean;
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
  /** Mode flexible: nominal uang makan flat per hari. 0 di mode fixed. */
  mealAllowance: number;
  rows: ReceiptDayRow[];
  totals: {
    lsCount: number;
    lcHours: number;
    llCount: number;
    dailyAmount: number;
    holidayAmount: number;
    cetakAmount: number;
    /** Mode flexible: total menit lembur sebulan. */
    overtimeMinutes: number;
    /** Mode flexible: rupiah lembur (per-menit dari total menit). */
    overtimeAmount: number;
    /** Mode flexible: jumlah hari berhak uang makan. */
    mealCount: number;
    /** Mode flexible: rupiah uang makan (mealCount × nominal). */
    mealAmount: number;
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
      ls,
      lc,
      ll,
      mealEligible,
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
  const overtimeMinutes = flexible ? input.rows.reduce((s, r) => s + Math.max(0, r.overtimeMinutes), 0) : 0;
  const overtimeAmount = flexible
    ? Math.round((overtimeMinutes / 60) * (input.flexRatePerHour ?? 0))
    : 0;
  const mealCount = rows.reduce((s, r) => s + (r.mealEligible ? 1 : 0), 0);
  const mealAmount = flexible ? mealCount * (input.mealAllowance ?? 0) : 0;

  const grandTotal = flexible
    ? overtimeAmount + mealAmount
    : dailyAmount + holidayAmount + cetakAmount;

  return {
    employeeId: input.employeeId,
    employeeName: input.employeeName,
    employeeCode: input.employeeCode,
    department: input.department,
    year: input.year,
    month: input.month,
    monthLabel: `${MONTHS[input.month - 1]} ${input.year}`,
    flexible,
    flexRatePerHour: flexible ? input.flexRatePerHour ?? 0 : 0,
    mealAllowance: flexible ? input.mealAllowance ?? 0 : 0,
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
      mealCount,
      mealAmount,
      grandTotal,
    },
    rates: input.rates,
  };
}
