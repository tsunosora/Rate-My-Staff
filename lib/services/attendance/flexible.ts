/**
 * Mode "jam masuk bebas" (flexible): lembur dihitung dari DURASI kerja, bukan jam dinding.
 *
 * Aturan (dikonfirmasi user):
 * - Target kerja 8 jam. Durasi = jam pulang - jam masuk (KOTOR, istirahat tidak dipotong).
 * - Di atas 8 jam -> lembur, dihitung PER-MENIT (proporsional) memakai tarif per-jam jadwal.
 * - Di atas 10 jam -> tambahan uang makan (nominal flat, sekali per hari).
 *
 * Modul ini murni menghasilkan menit & kelayakan; konversi ke rupiah ada di lapisan struk.
 */

/** Target jam kerja sebelum lembur mulai berjalan (8 jam = 480 menit). */
export const FLEX_WORK_MINUTES = 8 * 60;

/** Ambang durasi untuk berhak uang makan (harus DI ATAS 10 jam = 600 menit). */
export const FLEX_MEAL_THRESHOLD_MINUTES = 10 * 60;

const DAY_MINUTES = 24 * 60;

export type FlexibleComputation = {
  /** Durasi kerja kotor dalam menit (pulang - masuk, menyeberang hari bila perlu). */
  workedMinutes: number;
  /** Menit lembur = max(0, durasi - 8 jam). */
  overtimeMinutes: number;
  /** Berhak uang makan bila durasi di atas 10 jam. */
  mealEligible: boolean;
  /** Mode flexible tak mengenal telat (jam masuk bebas). */
  status: string;
};

/**
 * Hitung lembur & kelayakan uang makan dari jam masuk/pulang (menit sejak 00:00).
 * Bila salah satu jam kosong (mis. lupa absen), tak ada durasi yang bisa dihitung.
 */
export function computeFlexible(
  clockInMin: number | null,
  clockOutMin: number | null
): FlexibleComputation {
  if (clockInMin == null || clockOutMin == null) {
    return { workedMinutes: 0, overtimeMinutes: 0, mealEligible: false, status: "on_time" };
  }

  let workedMinutes = clockOutMin - clockInMin;
  if (workedMinutes < 0) workedMinutes += DAY_MINUTES; // pulang esok hari (shift malam)

  const overtimeMinutes = Math.max(0, workedMinutes - FLEX_WORK_MINUTES);
  const mealEligible = workedMinutes > FLEX_MEAL_THRESHOLD_MINUTES;

  return { workedMinutes, overtimeMinutes, mealEligible, status: "on_time" };
}
