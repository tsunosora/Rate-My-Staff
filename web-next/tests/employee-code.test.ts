import { describe, expect, test } from "vitest";
import { generateEmployeeCode } from "@/lib/services/employee-code";

describe("generateEmployeeCode", () => {
  test("kode pertama untuk nama", () => {
    expect(generateEmployeeCode("Budi", [])).toBe("EMP-BUDI-001");
  });

  test("increment saat kode sudah ada", () => {
    expect(generateEmployeeCode("Budi", ["EMP-BUDI-001"])).toBe("EMP-BUDI-002");
    expect(
      generateEmployeeCode("Budi", ["EMP-BUDI-001", "EMP-BUDI-002"])
    ).toBe("EMP-BUDI-003");
  });

  test("normalisasi: uppercase, buang spasi & simbol", () => {
    expect(generateEmployeeCode("  budi santoso! ", [])).toBe("EMP-BUDISANTOSO-001");
  });

  test("hasil tidak pernah melebihi 20 karakter (base dipotong)", () => {
    const code = generateEmployeeCode("Abdurrahman Wahid Panjang", []);
    expect(code.length).toBeLessThanOrEqual(20);
    expect(code.startsWith("EMP-")).toBe(true);
    expect(code.endsWith("-001")).toBe(true);
  });

  test("fallback 'EMP' bila nama tidak punya karakter alfanumerik", () => {
    expect(generateEmployeeCode("!!!", [])).toBe("EMP-EMP-001");
  });

  test("mengabaikan kode existing yang beda base", () => {
    expect(generateEmployeeCode("Budi", ["EMP-ANI-001", "EMP-ANI-002"])).toBe(
      "EMP-BUDI-001"
    );
  });
});
