import { describe, expect, test } from "vitest";
import {
  computeWeightedValue,
  computeTotalScore,
  gradeFromScore,
} from "@/lib/services/grade";

describe("computeWeightedValue", () => {
  test("score * weight / 100", () => {
    expect(computeWeightedValue(4, 25)).toBe(1);
    expect(computeWeightedValue(5, 50)).toBe(2.5);
    expect(computeWeightedValue(3, 33.33)).toBeCloseTo(0.9999, 3);
  });
});

describe("computeTotalScore", () => {
  test("jumlah weighted value dari bobot 100%", () => {
    // 4*25 + 5*25 + 3*25 + 2*25 = (100+125+75+50)/100 = 3.5
    const scores = [
      { score: 4, weight: 25 },
      { score: 5, weight: 25 },
      { score: 3, weight: 25 },
      { score: 2, weight: 25 },
    ];
    expect(computeTotalScore(scores)).toBe(3.5);
  });

  test("dibulatkan 2 desimal", () => {
    const scores = [
      { score: 5, weight: 33.33 },
      { score: 4, weight: 33.33 },
      { score: 3, weight: 33.34 },
    ];
    expect(computeTotalScore(scores)).toBeCloseTo(4.0, 1);
  });

  test("array kosong -> 0", () => {
    expect(computeTotalScore([])).toBe(0);
  });
});

describe("gradeFromScore", () => {
  test("ambang grade", () => {
    expect(gradeFromScore(4.5)).toBe("Sangat Baik");
    expect(gradeFromScore(4.6)).toBe("Sangat Baik");
    expect(gradeFromScore(3.5)).toBe("Baik");
    expect(gradeFromScore(3.49)).toBe("Cukup");
    expect(gradeFromScore(2.5)).toBe("Cukup");
    expect(gradeFromScore(1.5)).toBe("Kurang");
    expect(gradeFromScore(1.49)).toBe("Sangat Kurang");
    expect(gradeFromScore(0)).toBe("Sangat Kurang");
  });
});
