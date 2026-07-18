import type { ReceiptRateSet, OvertimeRounding } from "./receipt";

export const DEFAULT_RECEIPT_RATES: ReceiptRateSet = { daily: 20000, holiday: 70000, cetak: 10000 };

export const DEFAULT_OVERTIME_ROUNDING: OvertimeRounding = "hour";

/** Key pengaturan lembur/struk di tabel Setting (bisa diubah di halaman Pengaturan). */
export const RECEIPT_SETTING_KEYS = {
  daily: "receipt_rate_daily",
  holiday: "receipt_rate_holiday",
  cetak: "receipt_rate_cetak",
  rounding: "overtime_rounding",
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
