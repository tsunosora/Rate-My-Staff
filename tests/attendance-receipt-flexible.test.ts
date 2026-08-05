import { describe, expect, test } from "vitest";
import { buildReceipt, type ReceiptInput } from "@/lib/services/attendance/receipt";

const base = {
  employeeId: 1,
  employeeName: "Budi",
  employeeCode: "EMP010",
  department: "Produksi",
  year: 2026,
  month: 4,
  rates: { daily: 20000, holiday: 70000, cetak: 10000 },
  flexible: true as const,
  flexRatePerHour: 10000,
  mealAllowance: 15000,
};

const mk = (over: Partial<ReceiptInput["rows"][number]>): ReceiptInput["rows"][number] => ({
  date: "2026-04-01",
  shift: "flexible",
  isHoliday: false,
  clockIn: "08:00",
  clockOut: "16:00",
  lateMinutes: 0,
  overtimeMinutes: 0,
  mealEligible: false,
  status: "on_time",
  ...over,
});

describe("buildReceipt — mode flexible (jam masuk bebas)", () => {
  test("lembur per-menit walau belum genap 1 jam (30m -> 5000), tak ada LS/LC/LL", () => {
    const d = buildReceipt({ ...base, rows: [mk({ clockOut: "16:30", overtimeMinutes: 30 })] });
    expect(d.flexible).toBe(true);
    expect(d.rows[0].ls).toBe(0);
    expect(d.rows[0].lc).toBe(0);
    expect(d.rows[0].ll).toBe(0);
    expect(d.totals.overtimeMinutes).toBe(30);
    expect(d.totals.overtimeAmount).toBe(5000); // (30/60)*10000
    expect(d.totals.mealCount).toBe(0);
    expect(d.totals.mealAmount).toBe(0);
    expect(d.totals.grandTotal).toBe(5000);
  });

  test("mode 'hour' TIDAK memotong lembur flexible: 50 menit tetap dibayar per-menit", () => {
    const d = buildReceipt({
      ...base,
      rounding: "hour",
      rows: [mk({ clockOut: "16:50", overtimeMinutes: 50 })],
    });
    expect(d.totals.overtimeAmount).toBe(8333); // round((50/60)*10000)
    expect(d.totals.grandTotal).toBe(8333);
  });

  test("di atas 10 jam -> uang makan 1x + lembur", () => {
    // 08:00 -> 18:31 = 631m, lembur 151m
    const d = buildReceipt({
      ...base,
      rows: [mk({ clockOut: "18:31", overtimeMinutes: 151, mealEligible: true })],
    });
    expect(d.totals.overtimeMinutes).toBe(151);
    expect(d.totals.overtimeAmount).toBe(25167); // round((151/60)*10000)
    expect(d.totals.mealCount).toBe(1);
    expect(d.totals.mealAmount).toBe(15000);
    expect(d.totals.grandTotal).toBe(25167 + 15000);
  });

  test("akumulasi banyak hari: menit dijumlah dulu baru dikonversi", () => {
    const d = buildReceipt({
      ...base,
      rows: [
        mk({ date: "2026-04-01", clockOut: "16:30", overtimeMinutes: 30 }),
        mk({ date: "2026-04-02", clockOut: "17:30", overtimeMinutes: 90 }),
        mk({ date: "2026-04-03", clockOut: "18:40", overtimeMinutes: 160, mealEligible: true }),
      ],
    });
    expect(d.totals.overtimeMinutes).toBe(280); // 30+90+160
    expect(d.totals.overtimeAmount).toBe(Math.round((280 / 60) * 10000)); // 46667
    expect(d.totals.mealCount).toBe(1);
    expect(d.totals.mealAmount).toBe(15000);
    expect(d.totals.dailyAmount).toBe(0);
    expect(d.totals.cetakAmount).toBe(0);
    expect(d.totals.holidayAmount).toBe(0);
  });

  test("hari tanpa lembur & tanpa uang makan -> 0 rupiah", () => {
    const d = buildReceipt({ ...base, rows: [mk({ clockOut: "16:00", overtimeMinutes: 0 })] });
    expect(d.totals.grandTotal).toBe(0);
  });
});

describe("buildReceipt — mode fixed tak terpengaruh field flexible", () => {
  test("tanpa flag flexible, field flex bernilai 0 & LS/LC/LL tetap jalan", () => {
    const d = buildReceipt({
      employeeId: 2,
      employeeName: "Ani",
      employeeCode: "EMP002",
      department: "Toko",
      year: 2026,
      month: 4,
      rates: { daily: 20000, holiday: 70000, cetak: 10000 },
      rows: [
        {
          date: "2026-04-01",
          shift: "longshift",
          isHoliday: false,
          clockIn: "08:00",
          clockOut: "22:00",
          lateMinutes: 0,
          overtimeMinutes: 60,
          status: "longshift",
        },
      ],
    });
    expect(d.flexible).toBe(false);
    expect(d.totals.overtimeAmount).toBe(0);
    expect(d.totals.mealAmount).toBe(0);
    expect(d.totals.lsCount).toBe(1);
    expect(d.totals.dailyAmount).toBe(20000);
    expect(d.totals.cetakAmount).toBe(10000);
    expect(d.totals.grandTotal).toBe(30000);
  });
});
