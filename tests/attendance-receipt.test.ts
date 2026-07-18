import { describe, expect, test } from "vitest";
import { buildReceipt, type ReceiptInput } from "@/lib/services/attendance/receipt";
import { resolveReceiptRates, DEFAULT_RECEIPT_RATES } from "@/lib/services/attendance/receipt-rates";

const rates = { daily: 20000, holiday: 70000, cetak: 10000 };
const base = {
  employeeId: 1,
  employeeName: "Faisal",
  employeeCode: "EMP001",
  department: "Toko",
  year: 2026,
  month: 4,
  rates,
};
const mk = (over: Partial<ReceiptInput["rows"][number]>): ReceiptInput["rows"][number] => ({
  date: "2026-04-01",
  shift: null,
  isHoliday: false,
  clockIn: null,
  clockOut: null,
  lateMinutes: 0,
  overtimeMinutes: 0,
  status: "absent",
  ...over,
});

describe("buildReceipt", () => {
  test("longshift hari kerja -> LS=1, LC dari overtime, Lembur Harian", () => {
    const d = buildReceipt({
      ...base,
      rows: [
        mk({ date: "2026-04-01", shift: "longshift", clockIn: "08:00", clockOut: "22:00", overtimeMinutes: 60, status: "longshift" }),
      ],
    });
    const row = d.rows[0];
    expect(row.ls).toBe(1);
    expect(row.lc).toBe(1); // 60m = 1.00 jam
    expect(row.ll).toBe(0);
    expect(row.shiftLabel).toBe("Long");
    expect(row.dayName).toBe("Rabu"); // 2026-04-01 = Rabu
    expect(d.totals.lsCount).toBe(1);
    expect(d.totals.dailyAmount).toBe(20000);
    expect(d.totals.cetakAmount).toBe(10000);
  });

  test("hari libur tetap masuk -> LL=1, Lembur Libur", () => {
    const d = buildReceipt({
      ...base,
      rows: [
        mk({ date: "2026-04-05", isHoliday: true, shift: "siang", clockIn: "13:00", clockOut: "21:00", status: "on_time" }),
      ],
    });
    expect(d.rows[0].ll).toBe(1);
    expect(d.rows[0].ls).toBe(0); // libur tidak dihitung LS
    expect(d.totals.llCount).toBe(1);
    expect(d.totals.holidayAmount).toBe(70000);
  });

  test("shift pagi lembur lewat 16:00 -> BUKAN LC", () => {
    const d = buildReceipt({
      ...base,
      rows: [
        mk({ date: "2026-04-02", shift: "pagi", clockIn: "08:00", clockOut: "17:00", overtimeMinutes: 60, status: "on_time" }),
      ],
    });
    expect(d.rows[0].lc).toBe(0);
    expect(d.totals.cetakAmount).toBe(0);
  });

  test("LC desimal apa adanya (90 menit = 1.50)", () => {
    const d = buildReceipt({
      ...base,
      rows: [
        mk({ date: "2026-04-03", shift: "siang", clockIn: "13:00", clockOut: "22:30", overtimeMinutes: 90, status: "on_time" }),
      ],
    });
    expect(d.rows[0].lc).toBe(1.5);
    expect(d.totals.cetakAmount).toBe(15000);
  });

  test("hari libur kosong -> baris tetap ada, semua 0", () => {
    const d = buildReceipt({ ...base, rows: [mk({ date: "2026-04-06", isHoliday: true, status: "holiday" })] });
    expect(d.rows[0].worked).toBe(false);
    expect(d.rows[0].ll).toBe(0);
    expect(d.totals.grandTotal).toBe(0);
  });

  test("grand total = jumlah tiga subtotal", () => {
    const d = buildReceipt({
      ...base,
      rows: [
        mk({ date: "2026-04-01", shift: "longshift", clockIn: "08:00", clockOut: "22:00", overtimeMinutes: 120, status: "longshift" }),
        mk({ date: "2026-04-05", isHoliday: true, shift: "siang", clockIn: "13:00", clockOut: "21:00", status: "on_time" }),
      ],
    });
    expect(d.totals.grandTotal).toBe(d.totals.dailyAmount + d.totals.holidayAmount + d.totals.cetakAmount);
    expect(d.monthLabel).toBe("April 2026");
  });
});

describe("resolveReceiptRates", () => {
  test("map by-nama (case-insensitive contains)", () => {
    const r = resolveReceiptRates([
      { name: "Longshift", rate: 20000 },
      { name: "Lembur Libur", rate: 70000 },
      { name: "Lembur Cetak", rate: 10000 },
    ]);
    expect(r).toEqual({ daily: 20000, holiday: 70000, cetak: 10000 });
  });

  test("nama 'Lembur Harian' juga memetakan ke daily", () => {
    const r = resolveReceiptRates([{ name: "Lembur Harian", rate: 25000 }]);
    expect(r.daily).toBe(25000);
  });

  test("fallback default bila kategori tidak lengkap", () => {
    expect(resolveReceiptRates([])).toEqual(DEFAULT_RECEIPT_RATES);
  });

  test("menerima Decimal-like (toString)", () => {
    const r = resolveReceiptRates([{ name: "Lembur Cetak", rate: { toString: () => "12000" } }]);
    expect(r.cetak).toBe(12000);
  });
});
