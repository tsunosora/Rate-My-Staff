import { describe, expect, test } from "vitest";
import { makeCalculator, LONGSHIFT_EXTRA_PER_HOUR } from "@/lib/services/overtime";

const cat = (over: Partial<{ name: string; type: "flat" | "hourly" | "hybrid"; rate: number }>) => ({
  name: "Kategori",
  type: "hourly" as const,
  rate: 0,
  ...over,
});

describe("StandardOvertimeCalculator (context=default)", () => {
  const calc = makeCalculator("default");

  test("flat -> rate apa adanya (abaikan menit)", () => {
    expect(calc.calculate({ category: cat({ type: "flat", rate: 100000 }), approvedMinutes: 120 })).toBe(100000);
  });
  test("hourly -> (menit/60) * rate", () => {
    expect(calc.calculate({ category: cat({ type: "hourly", rate: 15000 }), approvedMinutes: 120 })).toBe(30000);
  });
  test("hybrid -> hourly", () => {
    expect(calc.calculate({ category: cat({ type: "hybrid", rate: 15000 }), approvedMinutes: 90 })).toBe(22500);
  });
});

describe("RateMyStaffOvertimeCalculator (context=rate_my_staff_custom)", () => {
  const calc = makeCalculator("rate_my_staff_custom");

  test("Lembur Libur -> flat rate apapun menitnya", () => {
    expect(calc.calculate({ category: cat({ name: "Lembur Libur", type: "flat", rate: 100000 }), approvedMinutes: 300 })).toBe(100000);
  });
  test("Lembur Cetak -> hourly", () => {
    expect(calc.calculate({ category: cat({ name: "Lembur Cetak", type: "hourly", rate: 15000 }), approvedMinutes: 120 })).toBe(30000);
  });
  test("Longshift -> base rate + extra per jam", () => {
    // 50000 + (120/60)*LONGSHIFT_EXTRA_PER_HOUR
    const expected = 50000 + 2 * LONGSHIFT_EXTRA_PER_HOUR;
    expect(calc.calculate({ category: cat({ name: "Longshift", type: "hybrid", rate: 50000 }), approvedMinutes: 120 })).toBe(expected);
  });
  test("fallback flat", () => {
    expect(calc.calculate({ category: cat({ name: "Lain", type: "flat", rate: 5000 }), approvedMinutes: 200 })).toBe(5000);
  });
  test("fallback hourly", () => {
    expect(calc.calculate({ category: cat({ name: "Lain", type: "hourly", rate: 15000 }), approvedMinutes: 60 })).toBe(15000);
  });
});

describe("factory", () => {
  test("context tak dikenal -> Standard", () => {
    const calc = makeCalculator("apa_saja");
    expect(calc.calculate({ category: cat({ type: "hourly", rate: 10000 }), approvedMinutes: 60 })).toBe(10000);
  });
});
