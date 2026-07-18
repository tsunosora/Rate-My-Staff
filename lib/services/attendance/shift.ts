import { getAllSettings } from "@/lib/settings";

/** Konfigurasi jam toko & shift (dari halaman Pengaturan; ada default aman). */
export type ShiftConfig = {
  storeOpen: string; // "08:00" — buka toko & mulai shift pagi
  storeClose: string; // "21:00" — tutup toko & akhir shift siang/longshift
  morningEnd: string; // "16:00" — akhir shift pagi
  afternoonStart: string; // "13:00" — mulai shift siang & batas pagi/siang (dari jam masuk)
  longshiftMinOut: string; // "20:00" — masuk pagi & pulang >= jam ini => longshift
  lateToleranceMinutes: number; // 15
};

export const DEFAULT_SHIFT_CONFIG: ShiftConfig = {
  storeOpen: "08:00",
  storeClose: "21:00",
  morningEnd: "16:00",
  afternoonStart: "13:00",
  longshiftMinOut: "20:00",
  lateToleranceMinutes: 15,
};

/** Key pengaturan di tabel Setting. */
export const SHIFT_SETTING_KEYS = {
  storeOpen: "store_open_time",
  storeClose: "store_close_time",
  morningEnd: "shift_morning_end",
  afternoonStart: "shift_afternoon_start",
  longshiftMinOut: "longshift_min_out",
  lateTolerance: "shift_late_tolerance",
} as const;

export type ShiftKind = "pagi" | "siang" | "longshift";

export type ShiftComputation = {
  shift: ShiftKind;
  status: string; // "on_time" | "late" | "longshift"
  lateMinutes: number;
  overtimeMinutes: number;
};

/** "HH:MM" -> menit sejak 00:00. Null bila format salah. */
function hmToMin(time: string | null | undefined): number | null {
  if (!time) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Baca konfigurasi shift dari Setting (fallback ke default). */
export async function loadShiftConfig(): Promise<ShiftConfig> {
  const s = await getAllSettings();
  const str = (key: string, d: string) => {
    const v = s[key];
    return v && v.trim() !== "" ? v : d;
  };
  const num = (key: string, d: number) => {
    const n = Number(s[key]);
    return Number.isFinite(n) && s[key] != null && s[key] !== "" ? n : d;
  };
  return {
    storeOpen: str(SHIFT_SETTING_KEYS.storeOpen, DEFAULT_SHIFT_CONFIG.storeOpen),
    storeClose: str(SHIFT_SETTING_KEYS.storeClose, DEFAULT_SHIFT_CONFIG.storeClose),
    morningEnd: str(SHIFT_SETTING_KEYS.morningEnd, DEFAULT_SHIFT_CONFIG.morningEnd),
    afternoonStart: str(SHIFT_SETTING_KEYS.afternoonStart, DEFAULT_SHIFT_CONFIG.afternoonStart),
    longshiftMinOut: str(SHIFT_SETTING_KEYS.longshiftMinOut, DEFAULT_SHIFT_CONFIG.longshiftMinOut),
    lateToleranceMinutes: num(SHIFT_SETTING_KEYS.lateTolerance, DEFAULT_SHIFT_CONFIG.lateToleranceMinutes),
  };
}

/**
 * Deteksi shift & hitung telat/lembur otomatis dari jam masuk/pulang (menit).
 * - Masuk sebelum `afternoonStart` = shift pagi; selebihnya shift siang.
 * - Shift pagi tapi pulang >= `longshiftMinOut` => LONGSHIFT (buka s/d tutup).
 * - Telat = menit lewat jam mulai shift (di atas toleransi).
 * - Lembur = menit kerja melebihi jam pulang shift (pagi: morningEnd; siang/longshift: storeClose).
 */
export function computeShift(
  clockInMin: number | null,
  clockOutMin: number | null,
  cfg: ShiftConfig = DEFAULT_SHIFT_CONFIG
): ShiftComputation {
  const open = hmToMin(cfg.storeOpen) ?? 480;
  const close = hmToMin(cfg.storeClose) ?? 1260;
  const morningEnd = hmToMin(cfg.morningEnd) ?? 960;
  const split = hmToMin(cfg.afternoonStart) ?? 780;
  const longOut = hmToMin(cfg.longshiftMinOut) ?? 1200;
  const tol = cfg.lateToleranceMinutes;

  let shift: ShiftKind;
  if (clockInMin != null) {
    // Shift ditentukan dari JAM MASUK: dekat jam buka (08:00) = pagi, dekat mulai siang (13:00) = siang.
    // Batas = titik tengah open↔afternoonStart (mis. 10:30) agar karyawan siang yang datang sedikit
    // lebih awal (mis. 12:51) tidak salah dikira shift pagi.
    const morningCutoff = (open + split) / 2;
    const startedMorning = clockInMin < morningCutoff;
    shift = startedMorning ? "pagi" : "siang";
    if (startedMorning && clockOutMin != null && clockOutMin >= longOut) shift = "longshift";
  } else {
    // Tanpa jam masuk (lupa absen masuk): tebak shift dari jam pulang — dekat tutup = siang, else pagi.
    const nearClose =
      clockOutMin != null && Math.abs(clockOutMin - close) <= Math.abs(clockOutMin - morningEnd);
    shift = nearClose ? "siang" : "pagi";
  }

  const expectedStart = shift === "siang" ? split : open;
  const expectedEnd = shift === "pagi" ? morningEnd : close;

  const lateMinutes =
    clockInMin != null && clockInMin > expectedStart + tol ? clockInMin - expectedStart : 0;
  const overtimeMinutes =
    clockOutMin != null && clockOutMin > expectedEnd ? clockOutMin - expectedEnd : 0;

  const status = shift === "longshift" ? "longshift" : lateMinutes > 0 ? "late" : "on_time";
  return { shift, status, lateMinutes, overtimeMinutes };
}

/**
 * Saran jam yang hilang berdasarkan shift & sisi yang kosong:
 * - masuk hilang → jam mulai shift (pagi/longshift: buka 08:00; siang: 13:00).
 * - pulang hilang → jam selesai shift (pagi: 16:00; siang/longshift: tutup 21:00).
 * Mis. hanya ada scan pulang 16:00 (shift pagi) → saran masuk 08:00; scan pulang 21:00 → saran masuk 13:00.
 */
export function suggestMissingTime(
  shift: ShiftKind,
  missing: "in" | "out",
  cfg: ShiftConfig = DEFAULT_SHIFT_CONFIG
): string {
  if (missing === "in") return shift === "siang" ? cfg.afternoonStart : cfg.storeOpen;
  return shift === "pagi" ? cfg.morningEnd : cfg.storeClose;
}
