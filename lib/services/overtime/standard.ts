import { hourly, type OvertimeCalculator, type OvertimeInput } from "./types";

/** Engine default: flat -> rate; hourly/hybrid -> per jam. */
export class StandardOvertimeCalculator implements OvertimeCalculator {
  calculate({ category, approvedMinutes }: OvertimeInput): number {
    if (category.type === "flat") return category.rate;
    return hourly(category.rate, approvedMinutes);
  }
}
