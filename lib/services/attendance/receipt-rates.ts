import type { ReceiptRateSet, OvertimeRounding } from "./receipt";

export const DEFAULT_RECEIPT_RATES: ReceiptRateSet = { daily: 20000, holiday: 70000, cetak: 10000 };

export const DEFAULT_OVERTIME_ROUNDING: OvertimeRounding = "hour";

/** Key pengaturan lembur/struk di tabel Setting (bisa diubah di halaman Pengaturan). */
export const RECEIPT_SETTING_KEYS = {
  daily: "receipt_rate_daily",
  holiday: "receipt_rate_holiday",
  cetak: "receipt_rate_cetak",
  rounding: "overtime_rounding",
  /** Uang makan flat per hari untuk mode flexible (durasi kerja di atas 10 jam). */
  mealAllowance: "flex_meal_allowance",
} as const;

/** Nominal uang makan default (mode flexible) bila belum diatur. */
export const DEFAULT_MEAL_ALLOWANCE = 0;

/** Label istilah pembayaran di struk (bisa diganti dari Pengaturan). */
export type ReceiptLabelSet = {
  daily: string; // LS — default "Lembur Harian"
  holiday: string; // LL — default "Lembur Libur"
  cetak: string; // LC — default "Lembur Cetak"
  flexOvertime: string; // mode flexible — default "Lembur (per jam)"
  meal: string; // mode flexible — default "Uang Makan"
};

export const DEFAULT_RECEIPT_LABELS: ReceiptLabelSet = {
  daily: "Lembur Harian",
  holiday: "Lembur Libur",
  cetak: "Lembur Cetak",
  flexOvertime: "Lembur (per jam)",
  meal: "Uang Makan",
};

/** Key pengaturan label istilah struk di tabel Setting. */
export const RECEIPT_LABEL_KEYS = {
  daily: "label_lembur_harian",
  holiday: "label_lembur_libur",
  cetak: "label_lembur_cetak",
  flexOvertime: "label_lembur_flex",
  meal: "label_uang_makan",
} as const;

export type CategoryLike = { name: string; rate: number | { toString(): string } };
export type SettingsMap = Record<string, string | null>;

function num(v: CategoryLike["rate"]): number {
  return typeof v === "number" ? v : Number(v.toString());
}

/** Ambil angka valid dari setting; null bila kosong/bukan angka. */
function settingNum(settings: SettingsMap | undefined, key: string): number | null {
  if (!settings) return null;
  const raw = settings[key];
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * Petakan tarif struk dengan presedensi: default -> OvertimeCategory (by-nama) -> Setting (menang).
 * OvertimeCategory by-nama (case-insensitive contains):
 * - "libur"                   -> holiday
 * - "cetak"                   -> cetak
 * - "longshift" atau "harian" -> daily
 * Setting (bila diisi) menimpa keduanya.
 */
export function resolveReceiptRates(
  categories: CategoryLike[],
  settings?: SettingsMap
): ReceiptRateSet {
  const out: ReceiptRateSet = { ...DEFAULT_RECEIPT_RATES };
  for (const c of categories) {
    const n = c.name.toLowerCase();
    if (n.includes("libur")) out.holiday = num(c.rate);
    else if (n.includes("cetak")) out.cetak = num(c.rate);
    else if (n.includes("longshift") || n.includes("harian")) out.daily = num(c.rate);
  }
  const sDaily = settingNum(settings, RECEIPT_SETTING_KEYS.daily);
  const sHoliday = settingNum(settings, RECEIPT_SETTING_KEYS.holiday);
  const sCetak = settingNum(settings, RECEIPT_SETTING_KEYS.cetak);
  if (sDaily != null) out.daily = sDaily;
  if (sHoliday != null) out.holiday = sHoliday;
  if (sCetak != null) out.cetak = sCetak;
  return out;
}

/** Baca kebijakan pembulatan lembur dari Setting (default "hour" = jam penuh). */
export function resolveOvertimeRounding(settings?: SettingsMap): OvertimeRounding {
  return settings?.[RECEIPT_SETTING_KEYS.rounding] === "decimal" ? "decimal" : DEFAULT_OVERTIME_ROUNDING;
}

/** Baca nominal uang makan (mode flexible) dari Setting; default 0 bila kosong/bukan angka. */
export function resolveMealAllowance(settings?: SettingsMap): number {
  return settingNum(settings, RECEIPT_SETTING_KEYS.mealAllowance) ?? DEFAULT_MEAL_ALLOWANCE;
}

/** Baca label istilah struk dari Setting; label kosong/tak diisi memakai default. */
export function resolveReceiptLabels(settings?: SettingsMap): ReceiptLabelSet {
  const pick = (key: string, d: string) => {
    const v = settings?.[key];
    return v != null && v.trim() !== "" ? v : d;
  };
  return {
    daily: pick(RECEIPT_LABEL_KEYS.daily, DEFAULT_RECEIPT_LABELS.daily),
    holiday: pick(RECEIPT_LABEL_KEYS.holiday, DEFAULT_RECEIPT_LABELS.holiday),
    cetak: pick(RECEIPT_LABEL_KEYS.cetak, DEFAULT_RECEIPT_LABELS.cetak),
    flexOvertime: pick(RECEIPT_LABEL_KEYS.flexOvertime, DEFAULT_RECEIPT_LABELS.flexOvertime),
    meal: pick(RECEIPT_LABEL_KEYS.meal, DEFAULT_RECEIPT_LABELS.meal),
  };
}
