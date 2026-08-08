import { describe, expect, test } from "vitest";
import {
  monthPeriod,
  weekRange,
  weekLabel,
  weekPeriod,
  customPeriod,
  periodFileTag,
  resolveReceiptPeriod,
} from "@/lib/services/attendance/period";

describe("monthPeriod", () => {
  test("rentang bulan penuh + label", () => {
    const p = monthPeriod(2026, 4);
    expect(p).toMatchObject({ mode: "month", year: 2026, month: 4, startStr: "2026-04-01", endStr: "2026-04-30", label: "April 2026" });
  });
  test("Februari tahun kabisat -> 29 hari", () => {
    expect(monthPeriod(2028, 2).endStr).toBe("2028-02-29");
  });
});

describe("weekRange — Senin s/d Minggu", () => {
  test("hari di tengah minggu -> Senin..Minggu", () => {
    // 2026-04-08 = Rabu -> Senin 06, Minggu 12
    expect(weekRange("2026-04-08")).toEqual({ startStr: "2026-04-06", endStr: "2026-04-12" });
  });
  test("Senin -> awal minggu itu sendiri", () => {
    expect(weekRange("2026-04-06")).toEqual({ startStr: "2026-04-06", endStr: "2026-04-12" });
  });
  test("Minggu -> masih minggu yang sama (bukan minggu berikutnya)", () => {
    // 2026-04-12 = Minggu
    expect(weekRange("2026-04-12")).toEqual({ startStr: "2026-04-06", endStr: "2026-04-12" });
  });
  test("minggu lintas bulan", () => {
    // 2026-05-01 = Jumat -> Senin 27 Apr, Minggu 03 Mei
    expect(weekRange("2026-05-01")).toEqual({ startStr: "2026-04-27", endStr: "2026-05-03" });
  });
});

describe("weekLabel", () => {
  test("dalam satu bulan", () => {
    expect(weekLabel("2026-04-06", "2026-04-12")).toBe("06–12 Apr 2026");
  });
  test("lintas bulan", () => {
    expect(weekLabel("2026-04-27", "2026-05-03")).toBe("27 Apr – 03 Mei 2026");
  });
});

describe("weekPeriod", () => {
  test("year/month dari tanggal AWAL minggu (lintas bulan)", () => {
    const p = weekPeriod("2026-05-01"); // minggu mulai 27 Apr
    expect(p).toMatchObject({ mode: "week", year: 2026, month: 4, startStr: "2026-04-27", endStr: "2026-05-03" });
    expect(p.label).toBe("27 Apr – 03 Mei 2026");
  });
});

describe("customPeriod", () => {
  test("rentang bebas + label + year/month dari tanggal awal", () => {
    const p = customPeriod("2026-04-03", "2026-04-20");
    expect(p).toMatchObject({ mode: "custom", year: 2026, month: 4, startStr: "2026-04-03", endStr: "2026-04-20" });
    expect(p.label).toBe("03–20 Apr 2026");
  });
  test("tanggal terbalik -> otomatis ditukar", () => {
    const p = customPeriod("2026-04-20", "2026-04-03");
    expect(p).toMatchObject({ startStr: "2026-04-03", endStr: "2026-04-20" });
  });
  test("lintas bulan -> label rentang", () => {
    expect(customPeriod("2026-04-27", "2026-05-03").label).toBe("27 Apr – 03 Mei 2026");
  });
});

describe("periodFileTag", () => {
  test("bulan", () => {
    expect(periodFileTag(monthPeriod(2026, 4))).toBe("2026-4");
  });
  test("minggu", () => {
    expect(periodFileTag(weekPeriod("2026-04-08"))).toBe("2026-04-06_2026-04-12");
  });
  test("custom", () => {
    expect(periodFileTag(customPeriod("2026-04-03", "2026-04-20"))).toBe("2026-04-03_2026-04-20");
  });
});

describe("resolveReceiptPeriod", () => {
  const now = new Date(2026, 6, 15); // 15 Juli 2026

  test("default -> bulan berjalan bila param kosong", () => {
    expect(resolveReceiptPeriod(new URLSearchParams(""), now)).toMatchObject({ mode: "month", year: 2026, month: 7 });
  });
  test("bulan eksplisit", () => {
    expect(resolveReceiptPeriod(new URLSearchParams("year=2025&month=3"), now)).toMatchObject({ mode: "month", year: 2025, month: 3 });
  });
  test("mingguan pakai param week", () => {
    const p = resolveReceiptPeriod(new URLSearchParams("period=week&week=2026-04-08"), now);
    expect(p).toMatchObject({ mode: "week", startStr: "2026-04-06", endStr: "2026-04-12" });
  });
  test("mingguan tanpa tanggal valid -> minggu dari `now`", () => {
    const p = resolveReceiptPeriod(new URLSearchParams("period=week"), now);
    // 2026-07-15 = Rabu -> Senin 13 Jul
    expect(p).toMatchObject({ mode: "week", startStr: "2026-07-13", endStr: "2026-07-19" });
  });
  test("custom pakai start & end", () => {
    const p = resolveReceiptPeriod(new URLSearchParams("period=custom&start=2026-04-03&end=2026-04-20"), now);
    expect(p).toMatchObject({ mode: "custom", startStr: "2026-04-03", endStr: "2026-04-20" });
  });
  test("custom tanpa start/end valid -> fallback bulan berjalan", () => {
    const p = resolveReceiptPeriod(new URLSearchParams("period=custom&start=xx"), now);
    expect(p).toMatchObject({ mode: "month", year: 2026, month: 7 });
  });
});
