import { describe, expect, test } from "vitest";
import {
  deriveScans,
  buildImportPreview,
  type ImportEmployee,
} from "@/lib/services/attendance/import-map";

describe("deriveScans", () => {
  test("dua scan → in (pertama) & out (terakhir)", () => {
    expect(deriveScans(["07:59:18", "16:50:50"])).toEqual([
      { time: "07:59:18", scanType: "in" },
      { time: "16:50:50", scanType: "out" },
    ]);
  });

  test("empat scan → hanya pakai pertama (in) & terakhir (out)", () => {
    expect(deriveScans(["08:00:00", "12:00:00", "13:00:00", "17:00:00"])).toEqual([
      { time: "08:00:00", scanType: "in" },
      { time: "17:00:00", scanType: "out" },
    ]);
  });

  test("satu scan pagi → in; satu scan malam → out (heuristik noon 12)", () => {
    expect(deriveScans(["08:01:30"])).toEqual([{ time: "08:01:30", scanType: "in" }]);
    expect(deriveScans(["21:00:34"])).toEqual([{ time: "21:00:34", scanType: "out" }]);
  });

  test("nol scan → kosong", () => {
    expect(deriveScans([])).toEqual([]);
  });

  test("dobel scan masuk (08:00 & 08:05) → satu masuk, ambil paling terlambat", () => {
    expect(deriveScans(["08:00:00", "08:05:00"])).toEqual([
      { time: "08:05:00", scanType: "in" },
    ]);
  });

  test("dobel masuk pagi + pulang → masuk = scan paling terlambat di grup pagi", () => {
    expect(deriveScans(["07:58:00", "08:03:00", "16:00:00"])).toEqual([
      { time: "08:03:00", scanType: "in" },
      { time: "16:00:00", scanType: "out" },
    ]);
  });

  test("dobel masuk siang + dobel pulang → ambil paling terlambat tiap grup", () => {
    expect(deriveScans(["13:00:00", "13:04:00", "21:00:00", "21:06:00"])).toEqual([
      { time: "13:04:00", scanType: "in" },
      { time: "21:06:00", scanType: "out" },
    ]);
  });

  test("dobel pulang malam saja (20:58 & 21:03) → satu keluar, paling terlambat", () => {
    expect(deriveScans(["20:58:00", "21:03:00"])).toEqual([
      { time: "21:03:00", scanType: "out" },
    ]);
  });
});

const employees: ImportEmployee[] = [
  {
    id: 10,
    machinePin: "5",
    fullName: "Luluk Zahro",
    workSchedule: { startTime: "08:00", endTime: "16:00", lateToleranceMinutes: 15, isHoliday: false },
  },
  // PIN 6 sengaja tidak ada → unmatched
];

describe("buildImportPreview", () => {
  test("mencocokkan PIN→machinePin & menghitung status dari jadwal", () => {
    const rows = [{ pin: "5", name: "LULUK Z", dateISO: "2026-05-02", scans: ["07:59:18", "16:50:50"] }];
    const { rows: preview, summary } = buildImportPreview(rows, employees);
    expect(preview[0]).toMatchObject({
      pin: "5",
      employeeId: 10,
      matched: true,
      dateISO: "2026-05-02",
      clockIn: "07:59",
      clockOut: "16:50",
      status: "on_time",
      overtimeMinutes: 50,
    });
    expect(summary.matched).toBe(1);
    expect(summary.unmatched).toBe(0);
  });

  test("baris terlambat menandai status late + lateMinutes", () => {
    const rows = [{ pin: "5", name: "LULUK Z", dateISO: "2026-05-11", scans: ["08:30:00", "16:05:00"] }];
    const { rows: preview } = buildImportPreview(rows, employees);
    expect(preview[0]).toMatchObject({ status: "late", lateMinutes: 30 });
  });

  test("PIN tak dikenal → matched=false, employeeId=null, masuk daftar unmatched", () => {
    const rows = [{ pin: "6", name: "Damar", dateISO: "2026-05-02", scans: ["13:05:35", "21:04:23"] }];
    const { rows: preview, summary } = buildImportPreview(rows, employees);
    expect(preview[0]).toMatchObject({ matched: false, employeeId: null });
    expect(summary.unmatched).toBe(1);
    expect(summary.unmatchedPins).toContain("6");
  });

  test("tanggal Minggu dgn autoSunday → isHoliday=true diteruskan", () => {
    // 2026-05-03 = Minggu.
    const rows = [{ pin: "5", name: "LULUK Z", dateISO: "2026-05-03", scans: ["08:00:00", "16:00:00"] }];
    const { rows: preview } = buildImportPreview(rows, employees, { autoSunday: true });
    expect(preview[0].isHoliday).toBe(true);
  });

  test("tanggal custom di holidayDates → isHoliday=true", () => {
    const rows = [{ pin: "5", name: "LULUK Z", dateISO: "2026-05-11", scans: ["08:00:00", "16:00:00"] }];
    const { rows: preview } = buildImportPreview(rows, employees, {
      holidayDates: new Set(["2026-05-11"]),
    });
    expect(preview[0].isHoliday).toBe(true);
  });
});
