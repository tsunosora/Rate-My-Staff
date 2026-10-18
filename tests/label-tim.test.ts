import { describe, expect, it } from "vitest";
import { labelTim } from "@/lib/services/upah/label";

describe("labelTim", () => {
  it("tim otomatis bernama 'Tim <PIC>' tidak jadi 'Tim Tim'", () => {
    expect(labelTim("Tim Rina")).toBe("Tim Rina");
    expect(labelTim("tim gudang")).toBe("tim gudang");
  });
  it("nama tanpa awalan diberi 'Tim'", () => {
    expect(labelTim("Rina")).toBe("Tim Rina");
    expect(labelTim("Timur Raya")).toBe("Tim Timur Raya");
  });
});
