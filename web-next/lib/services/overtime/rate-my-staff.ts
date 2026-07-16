import { hourly, type OvertimeCalculator, type OvertimeInput } from "./types";

/** Tarif ekstra per jam untuk Longshift (dari sistem lama, hardcoded 10.000). */
export const LONGSHIFT_EXTRA_PER_HOUR = 10000;

/**
 * Engine kustom RateMyStaff (berbasis nama kategori):
 * - "Lembur Libur"  -> flat (rate, abaikan menit)
 * - "Lembur Cetak"  -> hourly
 * - "Longshift"     -> base rate + ekstra per jam
 * - lainnya         -> fallback: flat->rate, else hourly
 */
export class RateMyStaffOvertimeCalculator implements OvertimeCalculator {
  calculate({ category, approvedMinutes }: OvertimeInput): number {
    const name = category.name.toLowerCase();

    if (name.includes("libur")) return category.rate;
    if (name.includes("cetak")) return hourly(category.rate, approvedMinutes);
    if (name.includes("longshift")) {
      return category.rate + hourly(LONGSHIFT_EXTRA_PER_HOUR, approvedMinutes);
    }

    // Fallback mengikuti tipe kategori.
    if (category.type === "flat") return category.rate;
    return hourly(category.rate, approvedMinutes);
  }
}
