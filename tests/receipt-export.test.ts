import { describe, expect, test } from "vitest";
import { buildReceiptExcel } from "@/lib/services/export/receipt-excel";
import { buildReceiptPdf } from "@/lib/services/export/receipt-pdf";
import type { ReceiptData } from "@/lib/services/attendance/receipt";
import { DEFAULT_RECEIPT_LABELS } from "@/lib/services/attendance/receipt-rates";

const sample: ReceiptData = {
  employeeId: 1,
  employeeName: "Faisal",
  employeeCode: "EMP001",
  department: "Toko",
  year: 2026,
  month: 4,
  monthLabel: "April 2026",
  flexible: false,
  flexRatePerHour: 0,
  flexHolidayRatePerHour: 0,
  mealAllowance: 0,
  labels: DEFAULT_RECEIPT_LABELS,
  rows: [
    {
      date: "2026-04-01", dayName: "Rabu", isHoliday: false, clockIn: "08:00", clockOut: "22:00",
      shiftLabel: "Long", lateMinutes: 0, overtimeHours: 1, overtimeMinutes: 60, holidayOvertimeMinutes: 0, ls: 1, lc: 1, ll: 0, mealEligible: false, undertimeMinutes: 0, worked: true,
    },
    {
      date: "2026-04-06", dayName: "Minggu", isHoliday: true, clockIn: null, clockOut: null,
      shiftLabel: "—", lateMinutes: 0, overtimeHours: 0, overtimeMinutes: 0, holidayOvertimeMinutes: 0, ls: 0, lc: 0, ll: 0, mealEligible: false, undertimeMinutes: 0, worked: false,
    },
  ],
  totals: {
    lsCount: 1, lcHours: 1, llCount: 0, dailyAmount: 20000, holidayAmount: 0, cetakAmount: 10000,
    overtimeMinutes: 0, overtimeAmount: 0, holidayOvertimeMinutes: 0, holidayOvertimeAmount: 0, mealCount: 0, mealAmount: 0, undertimeMinutes: 0, grandTotal: 30000,
  },
  rates: { daily: 20000, holiday: 70000, cetak: 10000 },
};

describe("buildReceiptExcel", () => {
  test("satuan -> buffer valid", async () => {
    const buf = await buildReceiptExcel([sample]);
    expect(buf.length).toBeGreaterThan(0);
  });
  test("massal -> tidak lempar untuk banyak karyawan", async () => {
    const buf = await buildReceiptExcel([sample, { ...sample, employeeId: 2, employeeName: "Budi", employeeCode: "EMP002" }]);
    expect(buf.length).toBeGreaterThan(0);
  });
});

const flexSample: ReceiptData = {
  ...sample,
  employeeId: 3,
  employeeName: "Budi",
  employeeCode: "EMP010",
  flexible: true,
  flexRatePerHour: 10000,
  flexHolidayRatePerHour: 20000,
  mealAllowance: 15000,
  rows: [
    {
      date: "2026-04-01", dayName: "Rabu", isHoliday: false, clockIn: "08:00", clockOut: "18:31",
      shiftLabel: "Bebas", lateMinutes: 0, overtimeHours: 2.52, overtimeMinutes: 151, holidayOvertimeMinutes: 0, ls: 0, lc: 0, ll: 0, mealEligible: true, undertimeMinutes: 0, worked: true,
    },
    {
      date: "2026-04-06", dayName: "Minggu", isHoliday: true, clockIn: "08:00", clockOut: "17:00",
      shiftLabel: "Bebas", lateMinutes: 0, overtimeHours: 0, overtimeMinutes: 0, holidayOvertimeMinutes: 540, ls: 0, lc: 0, ll: 0, mealEligible: false, undertimeMinutes: 0, worked: true,
    },
  ],
  totals: {
    lsCount: 0, lcHours: 0, llCount: 0, dailyAmount: 0, holidayAmount: 0, cetakAmount: 0,
    overtimeMinutes: 151, overtimeAmount: 25167, holidayOvertimeMinutes: 540, holidayOvertimeAmount: 180000, mealCount: 1, mealAmount: 15000, undertimeMinutes: 0, grandTotal: 220167,
  },
};

describe("buildReceiptPdf", () => {
  test("PDF struk -> buffer valid", async () => {
    const buf = await buildReceiptPdf([sample], "2026-07-18 18:00");
    expect(buf.length).toBeGreaterThan(0);
  });
  test("PDF struk flexible (lembur + uang makan) -> buffer valid", async () => {
    const buf = await buildReceiptPdf([flexSample], "2026-07-18 18:00");
    expect(buf.length).toBeGreaterThan(0);
  });
});

describe("buildReceiptExcel — flexible", () => {
  test("struk flexible -> buffer valid", async () => {
    const buf = await buildReceiptExcel([flexSample]);
    expect(buf.length).toBeGreaterThan(0);
  });
});
