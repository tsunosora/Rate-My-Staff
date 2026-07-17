import type { OvertimeCalculator } from "./types";
import { StandardOvertimeCalculator } from "./standard";
import { RateMyStaffOvertimeCalculator, LONGSHIFT_EXTRA_PER_HOUR } from "./rate-my-staff";

export type { OvertimeCalculator, OvertimeInput, OvertimeCategoryInfo } from "./types";
export { LONGSHIFT_EXTRA_PER_HOUR };

/** Pilih engine berdasarkan konteks (setting `overtime_engine_context`). */
export function makeCalculator(context: string | null | undefined): OvertimeCalculator {
  if (context === "rate_my_staff_custom") return new RateMyStaffOvertimeCalculator();
  return new StandardOvertimeCalculator();
}
