import { describe, expect, test } from "vitest";
import {
  dayNumber,
  fromDayNumber,
  expandDates,
  countDays,
  rangesOverlap,
  validateLeaveRange,
  MAX_LEAVE_DAYS,
  MAX_BACKDATE_DAYS,
} from "@/lib/services/leave/range";

describe("dayNumber / fromDayNumber", () => {
  test("bolak-balik tetap sama", () => {
    for (const d of ["2026-01-01", "2026-02-28", "2026-09-18", "2026-12-31", "2028-02-29"]) {
      expect(fromDayNumber(dayNumber(d))).toBe(d);
    }
  });
  test("selisih hari benar melintasi bulan", () => {
    expect(dayNumber("2026-03-01") - dayNumber("2026-02-28")).toBe(1); // 2026 bukan kabisat
    expect(dayNumber("2028-03-01") - dayNumber("2028-02-28")).toBe(2); // 2028 kabisat
  });
});

describe("expandDates", () => {
  test("satu hari -> satu tanggal", () => {
    expect(expandDates("2026-09-18", "2026-09-18")).toEqual(["2026-09-18"]);
  });
  test("melintasi akhir bulan", () => {
    expect(expandDates("2026-09-29", "2026-10-02")).toEqual([
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
    ]);
  });
  test("rentang terbalik -> kosong", () => {
    expect(expandDates("2026-09-20", "2026-09-18")).toEqual([]);
  });
});

describe("countDays", () => {
  test("inklusif kedua ujung", () => {
    expect(countDays("2026-09-18", "2026-09-20")).toBe(3);
    expect(countDays("2026-09-18", "2026-09-18")).toBe(1);
  });
  test("terbalik -> 0", () => {
    expect(countDays("2026-09-20", "2026-09-18")).toBe(0);
  });
});

describe("rangesOverlap", () => {
  test("bersentuhan di satu hari = beririsan", () => {
    expect(rangesOverlap("2026-09-18", "2026-09-20", "2026-09-20", "2026-09-22")).toBe(true);
  });
  test("terpisah sehari = tidak beririsan", () => {
    expect(rangesOverlap("2026-09-18", "2026-09-19", "2026-09-21", "2026-09-22")).toBe(false);
  });
  test("satu rentang memuat rentang lain", () => {
    expect(rangesOverlap("2026-09-01", "2026-09-30", "2026-09-10", "2026-09-12")).toBe(true);
  });
});

describe("validateLeaveRange", () => {
  const today = "2026-09-18";

  test("satu hari hari ini -> boleh", () => {
    expect(validateLeaveRange(today, today, today)).toEqual({ ok: true });
  });
  test("tanggal selesai mendahului mulai -> ditolak", () => {
    const r = validateLeaveRange("2026-09-20", "2026-09-18", today);
    expect(r.ok).toBe(false);
  });
  test("format salah -> ditolak", () => {
    expect(validateLeaveRange("18-09-2026", today, today).ok).toBe(false);
  });
  test(`lebih dari ${MAX_LEAVE_DAYS} hari -> ditolak`, () => {
    expect(validateLeaveRange("2026-09-01", "2026-10-05", today).ok).toBe(false);
  });
  test("sakit kemarin (mundur) -> boleh", () => {
    expect(validateLeaveRange("2026-09-17", "2026-09-17", today).ok).toBe(true);
  });
  test(`mundur lebih dari ${MAX_BACKDATE_DAYS} hari -> ditolak`, () => {
    expect(validateLeaveRange("2026-07-01", "2026-07-01", today).ok).toBe(false);
  });
  test("salah ketik tahun (terlalu jauh di depan) -> ditolak", () => {
    expect(validateLeaveRange("2126-09-18", "2126-09-18", today).ok).toBe(false);
  });
  test("cuti bulan depan -> boleh", () => {
    expect(validateLeaveRange("2026-10-05", "2026-10-09", today).ok).toBe(true);
  });
});
