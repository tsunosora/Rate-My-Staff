import { describe, expect, test } from "vitest";
import { buildReceipt, formatHoursMinutes, type ReceiptInput } from "@/lib/services/attendance/receipt";
import {
  resolveReceiptRates,
  resolveOvertimeRounding,
  resolveReceiptLabels,
  resolveMealAllowance,
  DEFAULT_RECEIPT_RATES,
  DEFAULT_RECEIPT_LABELS,
  DEFAULT_MEAL_ALLOWANCE,
} from "@/lib/services/attendance/receipt-rates";

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

  test("default 'hour': hanya jam penuh dihitung (90 menit = 1, sisa 30 menit dibuang)", () => {
    const d = buildReceipt({
      ...base,
      rows: [
        mk({ date: "2026-04-03", shift: "siang", clockIn: "13:00", clockOut: "22:30", overtimeMinutes: 90, status: "on_time" }),
      ],
    });
    expect(d.rows[0].lc).toBe(1);
    expect(d.rows[0].overtimeHours).toBe(1);
    expect(d.totals.cetakAmount).toBe(10000);
  });

  test("default 'hour': 50 menit lembur TIDAK dihitung (LC=0)", () => {
    const d = buildReceipt({
      ...base,
      rows: [
        mk({ date: "2026-04-04", shift: "siang", clockIn: "13:00", clockOut: "21:50", overtimeMinutes: 50, status: "on_time" }),
      ],
    });
    expect(d.rows[0].lc).toBe(0);
    expect(d.rows[0].overtimeHours).toBe(0);
    expect(d.totals.cetakAmount).toBe(0);
  });

  test("mode 'decimal': jam desimal apa adanya (90 menit = 1.50)", () => {
    const d = buildReceipt({
      ...base,
      rounding: "decimal",
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

  test("Setting menimpa OvertimeCategory & default", () => {
    const r = resolveReceiptRates(
      [{ name: "Lembur Cetak", rate: 10000 }],
      { receipt_rate_daily: "25000", receipt_rate_cetak: "12000", receipt_rate_holiday: "" }
    );
    expect(r.daily).toBe(25000); // dari setting
    expect(r.cetak).toBe(12000); // setting menang atas kategori 10000
    expect(r.holiday).toBe(DEFAULT_RECEIPT_RATES.holiday); // setting kosong -> default
  });
});

describe("resolveOvertimeRounding", () => {
  test("default 'hour' bila tak diset", () => {
    expect(resolveOvertimeRounding()).toBe("hour");
    expect(resolveOvertimeRounding({})).toBe("hour");
  });
  test("'decimal' bila diset eksplisit", () => {
    expect(resolveOvertimeRounding({ overtime_rounding: "decimal" })).toBe("decimal");
  });
});

describe("resolveMealAllowance", () => {
  test("default Rp10.000 bila tak diset", () => {
    expect(DEFAULT_MEAL_ALLOWANCE).toBe(10000);
    expect(resolveMealAllowance()).toBe(10000);
    expect(resolveMealAllowance({})).toBe(10000);
    expect(resolveMealAllowance({ flex_meal_allowance: "" })).toBe(10000);
  });
  test("nilai eksplisit menimpa default", () => {
    expect(resolveMealAllowance({ flex_meal_allowance: "15000" })).toBe(15000);
    expect(resolveMealAllowance({ flex_meal_allowance: "0" })).toBe(0); // 0 eksplisit = nonaktif
  });
});

describe("resolveReceiptLabels", () => {
  test("default bila tak diset", () => {
    expect(resolveReceiptLabels()).toEqual(DEFAULT_RECEIPT_LABELS);
    expect(resolveReceiptLabels({})).toEqual(DEFAULT_RECEIPT_LABELS);
  });
  test("override sebagian; kosong -> tetap default", () => {
    const r = resolveReceiptLabels({ label_lembur_cetak: "Cetak Foto", label_uang_makan: "" });
    expect(r.cetak).toBe("Cetak Foto");
    expect(r.meal).toBe(DEFAULT_RECEIPT_LABELS.meal); // kosong -> default
    expect(r.daily).toBe(DEFAULT_RECEIPT_LABELS.daily);
  });
});

describe("formatHoursMinutes", () => {
  test("jam + menit", () => {
    expect(formatHoursMinutes(210)).toBe("3j 30m");
    expect(formatHoursMinutes(208)).toBe("3j 28m");
  });
  test("jam bulat / menit saja / nol", () => {
    expect(formatHoursMinutes(240)).toBe("4j");
    expect(formatHoursMinutes(30)).toBe("30m");
    expect(formatHoursMinutes(0)).toBe("0m");
    expect(formatHoursMinutes(-5)).toBe("0m"); // negatif diklem ke 0
  });
});

describe("buildReceipt: detail menit lembur (flexible)", () => {
  test("overtimeMinutes mentah tersedia per-hari", () => {
    const d = buildReceipt({
      ...base,
      flexible: true,
      flexRatePerHour: 10000,
      rows: [mk({ clockIn: "08:00", clockOut: "19:28", overtimeMinutes: 208, status: "on_time" })],
    });
    expect(d.rows[0].overtimeMinutes).toBe(208);
    expect(formatHoursMinutes(d.rows[0].overtimeMinutes)).toBe("3j 28m");
  });
});
