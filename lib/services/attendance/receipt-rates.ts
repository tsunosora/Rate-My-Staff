import type { ReceiptRateSet } from "./receipt";

export const DEFAULT_RECEIPT_RATES: ReceiptRateSet = { daily: 20000, holiday: 70000, cetak: 10000 };

export type CategoryLike = { name: string; rate: number | { toString(): string } };

function num(v: CategoryLike["rate"]): number {
  return typeof v === "number" ? v : Number(v.toString());
}

/**
 * Petakan OvertimeCategory -> tarif struk (by-nama, case-insensitive contains):
 * - "libur"                  -> holiday (Lembur Libur)
 * - "cetak"                  -> cetak (Lembur Cetak per jam)
 * - "longshift" atau "harian"-> daily (Lembur Harian per longshift-day)
 * Yang tidak dikenal diabaikan; yang kosong pakai DEFAULT_RECEIPT_RATES.
 */
export function resolveReceiptRates(categories: CategoryLike[]): ReceiptRateSet {
  const out: ReceiptRateSet = { ...DEFAULT_RECEIPT_RATES };
  for (const c of categories) {
    const n = c.name.toLowerCase();
    if (n.includes("libur")) out.holiday = num(c.rate);
    else if (n.includes("cetak")) out.cetak = num(c.rate);
    else if (n.includes("longshift") || n.includes("harian")) out.daily = num(c.rate);
  }
  return out;
}
