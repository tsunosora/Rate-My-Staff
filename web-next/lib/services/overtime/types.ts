export type OvertimeCategoryInfo = {
  name: string;
  type: "flat" | "hourly" | "hybrid";
  rate: number;
  companyContext?: string;
};

export type OvertimeInput = {
  category: OvertimeCategoryInfo;
  approvedMinutes: number;
};

export interface OvertimeCalculator {
  calculate(input: OvertimeInput): number;
}

export function hourly(rate: number, minutes: number): number {
  return Math.round((minutes / 60) * rate);
}
