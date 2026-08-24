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

  test("kekurangan jam ditandai & dijumlah (informasional, tak memotong uang)", () => {
    const d = buildReceipt({
      ...base,
      rows: [
        mk({ date: "2026-04-01", clockOut: "14:00", overtimeMinutes: 0, undertimeMinutes: 120 }),
        mk({ date: "2026-04-02", clockOut: "15:30", overtimeMinutes: 0, undertimeMinutes: 30 }),
      ],
    });
    expect(d.rows[0].undertimeMinutes).toBe(120);
    expect(d.totals.undertimeMinutes).toBe(150);
    expect(d.totals.grandTotal).toBe(0); // undertime tidak mengurangi rupiah
  });

  test("label default terisi bila tak dikirim", () => {
    const d = buildReceipt({ ...base, rows: [mk({})] });
    expect(d.labels.flexOvertime).toBe("Lembur (per jam)");
    expect(d.labels.meal).toBe("Uang Makan");
  });

  test("label bisa di-override (dari Pengaturan)", () => {
    const d = buildReceipt({
      ...base,
      labels: {
        daily: "Lembur Harian",
        holiday: "Lembur Libur",
        cetak: "Cetak Foto",
        flexOvertime: "Uang Lembur",
        flexHoliday: "Lembur Libur (per jam)",
        meal: "Uang Makan Malam",
      },
      rows: [mk({})],
    });
    expect(d.labels.flexOvertime).toBe("Uang Lembur");
    expect(d.labels.meal).toBe("Uang Makan Malam");
  });
});

describe("buildReceipt — mode flexible: lembur HARI LIBUR (semua jam)", () => {
  test("hari libur: SELURUH durasi jadi lembur libur di tarif khusus, bukan hanya di atas 8 jam", () => {
    // 08:00 -> 17:00 = 540m. Di hari kerja lemburnya cuma 60m; di hari libur SEMUA 540m dihitung.
    const d = buildReceipt({
      ...base,
      flexHolidayRatePerHour: 20000,
      rows: [mk({ isHoliday: true, clockOut: "17:00", workedMinutes: 540, overtimeMinutes: 60 })],
    });
    expect(d.totals.overtimeMinutes).toBe(0); // lembur biasa tak berlaku di hari libur
    expect(d.totals.overtimeAmount).toBe(0);
    expect(d.totals.holidayOvertimeMinutes).toBe(540);
    expect(d.totals.holidayOvertimeAmount).toBe(180000); // round((540/60)*20000)
    expect(d.rows[0].holidayOvertimeMinutes).toBe(540);
    expect(d.rows[0].overtimeMinutes).toBe(0);
    expect(d.totals.grandTotal).toBe(180000);
  });

  test("hari libur kerja < 8 jam: tetap semua jam dibayar, TIDAK ditandai kekurangan", () => {
    // 08:00 -> 13:00 = 300m (di bawah 8 jam).
    const d = buildReceipt({
      ...base,
      flexHolidayRatePerHour: 20000,
      rows: [mk({ isHoliday: true, clockOut: "13:00", workedMinutes: 300, undertimeMinutes: 180 })],
    });
    expect(d.totals.holidayOvertimeMinutes).toBe(300);
    expect(d.totals.holidayOvertimeAmount).toBe(100000); // round((300/60)*20000)
    expect(d.totals.undertimeMinutes).toBe(0); // hari libur tak dianggap kurang jam
    expect(d.rows[0].undertimeMinutes).toBe(0);
    expect(d.totals.grandTotal).toBe(100000);
  });

  test("tarif libur kosong -> fallback ke tarif lembur per jam biasa", () => {
    const d = buildReceipt({
      ...base, // flexRatePerHour 10000, tanpa flexHolidayRatePerHour
      rows: [mk({ isHoliday: true, clockOut: "16:00", workedMinutes: 480 })],
    });
    expect(d.flexHolidayRatePerHour).toBe(10000);
    expect(d.totals.holidayOvertimeMinutes).toBe(480);
    expect(d.totals.holidayOvertimeAmount).toBe(80000); // round((480/60)*10000)
  });

  test("hari libur tanpa scan lengkap (workedMinutes 0) -> tak ada lembur libur", () => {
    const d = buildReceipt({
      ...base,
      flexHolidayRatePerHour: 20000,
      rows: [mk({ isHoliday: true, clockIn: "08:00", clockOut: null, workedMinutes: 0 })],
    });
    expect(d.totals.holidayOvertimeMinutes).toBe(0);
    expect(d.totals.holidayOvertimeAmount).toBe(0);
    expect(d.totals.grandTotal).toBe(0);
  });

  test("campuran hari kerja + hari libur: dua total terpisah dijumlah", () => {
    const d = buildReceipt({
      ...base,
      flexHolidayRatePerHour: 20000,
      rows: [
        mk({ date: "2026-04-01", clockOut: "17:30", overtimeMinutes: 90 }), // kerja: lembur biasa 90m
        mk({ date: "2026-04-05", isHoliday: true, clockOut: "18:00", workedMinutes: 600, overtimeMinutes: 120 }), // libur: semua 600m
      ],
    });
    expect(d.totals.overtimeMinutes).toBe(90);
    expect(d.totals.overtimeAmount).toBe(15000); // round((90/60)*10000)
    expect(d.totals.holidayOvertimeMinutes).toBe(600);
    expect(d.totals.holidayOvertimeAmount).toBe(200000); // round((600/60)*20000)
    expect(d.totals.grandTotal).toBe(215000);
  });

  test("label lembur libur flexible: default & bisa di-override", () => {
    const d = buildReceipt({ ...base, rows: [mk({})] });
    expect(d.labels.flexHoliday).toBe("Lembur Libur (per jam)");
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
