import { describe, expect, test } from "vitest";
import {
  toMinutes,
  workedMinutesOf,
  summarizeDiscipline,
  compareDiscipline,
  previousRange,
} from "@/lib/services/portal/worktime";

describe("toMinutes", () => {
  test("jam normal", () => {
    expect(toMinutes("08:00")).toBe(480);
    expect(toMinutes("13:45")).toBe(825);
  });
  test("kosong / bentuk asing -> null", () => {
    expect(toMinutes(null)).toBeNull();
    expect(toMinutes("")).toBeNull();
    expect(toMinutes("8")).toBeNull();
    expect(toMinutes("25:00")).toBeNull();
    expect(toMinutes("08:70")).toBeNull();
  });
});

describe("workedMinutesOf", () => {
  test("shift pagi 08:00-16:00 = 8 jam", () => {
    expect(workedMinutesOf("08:00", "16:00")).toBe(480);
  });
  test("longshift 08:00-21:00 = 13 jam", () => {
    expect(workedMinutesOf("08:00", "21:00")).toBe(780);
  });
  test("lewat tengah malam 21:00-01:00 = 4 jam", () => {
    expect(workedMinutesOf("21:00", "01:00")).toBe(240);
  });
  test("salah satu jam kosong -> 0 (durasi tak dikarang)", () => {
    expect(workedMinutesOf("08:00", null)).toBe(0);
    expect(workedMinutesOf(null, "16:00")).toBe(0);
    expect(workedMinutesOf(null, null)).toBe(0);
  });
  test("lebih dari 16 jam dianggap data salah -> 0", () => {
    // lupa absen pulang, lalu scan besok paginya
    expect(workedMinutesOf("08:00", "07:00")).toBe(0);
  });
});

describe("summarizeDiscipline", () => {
  const rows = [
    { clockIn: "08:00", lateMinutes: 0, workedMinutes: 480 },
    { clockIn: "08:20", lateMinutes: 20, workedMinutes: 460 },
    { clockIn: "08:10", lateMinutes: 10, workedMinutes: 470 },
    { clockIn: null, lateMinutes: 0, workedMinutes: 0 }, // tidak masuk
  ];

  test("hanya menghitung hari yang ada scan masuk", () => {
    const s = summarizeDiscipline(rows);
    expect(s.workedDays).toBe(3);
    expect(s.totalWorkedMinutes).toBe(1410);
    expect(s.avgWorkedMinutes).toBe(470);
  });

  test("telat & tepat waktu", () => {
    const s = summarizeDiscipline(rows);
    expect(s.lateDays).toBe(2);
    expect(s.totalLateMinutes).toBe(30);
    expect(s.avgLateMinutes).toBe(10); // 30 menit / 3 hari kerja
    expect(s.onTimeRate).toBe(33); // 1 dari 3
  });

  test("periode kosong tidak membagi dengan nol", () => {
    expect(summarizeDiscipline([])).toMatchObject({
      workedDays: 0,
      avgLateMinutes: 0,
      onTimeRate: 0,
    });
  });
});

describe("compareDiscipline", () => {
  const mk = (avgLate: number, onTime: number, avgWorked = 480) => ({
    workedDays: 20,
    totalWorkedMinutes: avgWorked * 20,
    avgWorkedMinutes: avgWorked,
    lateDays: 0,
    totalLateMinutes: avgLate * 20,
    avgLateMinutes: avgLate,
    onTimeRate: onTime,
  });

  test("telat berkurang -> membaik", () => {
    const c = compareDiscipline(mk(4, 80), mk(10, 60));
    expect(c.trend).toBe("membaik");
    expect(c.lateDelta).toBe(-6);
    expect(c.onTimeDelta).toBe(20);
  });

  test("telat bertambah -> memburuk", () => {
    expect(compareDiscipline(mk(12, 50), mk(5, 75)).trend).toBe("memburuk");
  });

  test("beda di bawah 1 menit -> sama (bukan naik-turun tanpa makna)", () => {
    expect(compareDiscipline(mk(5.2, 70), mk(5, 70)).trend).toBe("sama");
  });

  test("belum ada data periode lalu -> baru", () => {
    const kosong = summarizeDiscipline([]);
    expect(compareDiscipline(mk(5, 70), kosong).trend).toBe("baru");
  });
});

describe("previousRange", () => {
  test("satu bulan penuh -> bulan sebelumnya yang sama panjang", () => {
    // September 2026 = 30 hari -> 30 hari sebelum 1 Sep
    expect(previousRange("2026-09-01", "2026-09-30")).toEqual({
      startStr: "2026-08-02",
      endStr: "2026-08-31",
    });
  });
  test("satu minggu -> minggu sebelumnya", () => {
    expect(previousRange("2026-09-14", "2026-09-20")).toEqual({
      startStr: "2026-09-07",
      endStr: "2026-09-13",
    });
  });
  test("satu hari -> hari sebelumnya", () => {
    expect(previousRange("2026-09-19", "2026-09-19")).toEqual({
      startStr: "2026-09-18",
      endStr: "2026-09-18",
    });
  });
});
