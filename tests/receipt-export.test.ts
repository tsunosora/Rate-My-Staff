import { describe, expect, test } from "vitest";
import { buildReceiptExcel } from "@/lib/services/export/receipt-excel";
import { buildReceiptPdf } from "@/lib/services/export/receipt-pdf";
import type { ReceiptData } from "@/lib/services/attendance/receipt";

const sample: ReceiptData = {
  employeeId: 1,
  employeeName: "Faisal",
  employeeCode: "EMP001",
  department: "Toko",
  year: 2026,
  month: 4,
  monthLabel: "April 2026",
  rows: [
    {
      date: "2026-04-01", dayName: "Rabu", isHoliday: false, clockIn: "08:00", clockOut: "22:00",
      shiftLabel: "Long", lateMinutes: 0, overtimeHours: 1, ls: 1, lc: 1, ll: 0, worked: true,
    },
    {
      date: "2026-04-06", dayName: "Minggu", isHoliday: true, clockIn: null, clockOut: null,
      shiftLabel: "—", lateMinutes: 0, overtimeHours: 0, ls: 0, lc: 0, ll: 0, worked: false,
    },
  ],
  totals: { lsCount: 1, lcHours: 1, llCount: 0, dailyAmount: 20000, holidayAmount: 0, cetakAmount: 10000, grandTotal: 30000 },
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

describe("buildReceiptPdf", () => {
  test("PDF struk -> buffer valid", async () => {
    const buf = await buildReceiptPdf([sample], "2026-07-18 18:00");
    expect(buf.length).toBeGreaterThan(0);
  });
});
