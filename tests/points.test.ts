import { describe, expect, test } from "vitest";
import {
  DEFAULT_POINT_RATES,
  POINT_SETTING_KEYS,
  resolvePointRates,
  pointsEnabled,
} from "@/lib/services/points/rates";
import {
  computeDayPoints,
  sumPoints,
  explainRatesByRole,
  type DayActivity,
} from "@/lib/services/points/compute";

const RATES = DEFAULT_POINT_RATES;

const kosong: DayActivity = {
  date: "2026-09-19",
  omzet: 0,
  transactions: 0,
  designJobs: 0,
  designServiceValue: 0,
  operatorJobs: 0,
  tasksOnTime: 0,
  tasksLate: 0,
  onTime: false,
};

describe("resolvePointRates", () => {
  test("tanpa pengaturan -> default", () => {
    expect(resolvePointRates({})).toEqual(DEFAULT_POINT_RATES);
  });

  test("nilai dari pengaturan menimpa default", () => {
    const r = resolvePointRates({ [POINT_SETTING_KEYS.perTaskOnTime]: "50" });
    expect(r.perTaskOnTime).toBe(50);
    expect(r.perDesignJob).toBe(DEFAULT_POINT_RATES.perDesignJob);
  });

  test("nilai kosong / bukan angka / negatif diabaikan", () => {
    const r = resolvePointRates({
      [POINT_SETTING_KEYS.perTaskOnTime]: "",
      [POINT_SETTING_KEYS.perDesignJob]: "abc",
      [POINT_SETTING_KEYS.perTransaction]: "-5",
    });
    expect(r.perTaskOnTime).toBe(DEFAULT_POINT_RATES.perTaskOnTime);
    expect(r.perDesignJob).toBe(DEFAULT_POINT_RATES.perDesignJob);
    expect(r.perTransaction).toBe(DEFAULT_POINT_RATES.perTransaction);
  });

  test("pembagi omzet nol ditolak — jangan sampai poin tak hingga", () => {
    expect(resolvePointRates({ [POINT_SETTING_KEYS.omzetPerPoint]: "0" }).omzetPerPoint).toBe(
      DEFAULT_POINT_RATES.omzetPerPoint
    );
  });

  test("poin menyala kecuali dimatikan tegas", () => {
    expect(pointsEnabled({})).toBe(true);
    expect(pointsEnabled({ points_enabled: "true" })).toBe(true);
    expect(pointsEnabled({ points_enabled: "false" })).toBe(false);
  });
});

describe("computeDayPoints", () => {
  test("hari kosong -> nol poin", () => {
    expect(computeDayPoints(kosong, RATES).total).toBe(0);
  });

  test("Rp1 juta = 100 poin (1 poin tiap Rp10.000)", () => {
    expect(computeDayPoints({ ...kosong, omzet: 1_000_000 }, RATES).omzetPoints).toBe(100);
  });

  test("sisa omzet di bawah satu kelipatan tidak dihitung setengah poin", () => {
    expect(computeDayPoints({ ...kosong, omzet: 19_999 }, RATES).omzetPoints).toBe(1);
    expect(computeDayPoints({ ...kosong, omzet: 9_999 }, RATES).omzetPoints).toBe(0);
  });

  test("omzet negatif (retur) tidak membuat poin minus", () => {
    expect(computeDayPoints({ ...kosong, omzet: -500_000 }, RATES).omzetPoints).toBe(0);
  });

  test("poin pekerjaan dari nota, desain & produksi", () => {
    const d = computeDayPoints(
      { ...kosong, transactions: 3, designJobs: 2, operatorJobs: 1.5 },
      RATES
    );
    // 3x5 + 2x10 + 1,5x10 = 15 + 20 + 15
    expect(d.jobPoints).toBe(50);
  });

  test("task tepat waktu bernilai lebih besar daripada yang telat", () => {
    const d = computeDayPoints({ ...kosong, tasksOnTime: 2, tasksLate: 3 }, RATES);
    expect(d.taskPoints).toBe(2 * 20 + 3 * 5);
  });

  test("hadir tepat waktu menambah poin, telat tidak", () => {
    expect(computeDayPoints({ ...kosong, onTime: true }, RATES).attendancePoints).toBe(10);
    expect(computeDayPoints({ ...kosong, onTime: false }, RATES).attendancePoints).toBe(0);
  });

  test("total = jumlah seluruh komponen", () => {
    const d = computeDayPoints(
      {
        date: "2026-09-19",
        omzet: 500_000,
        transactions: 4,
        designJobs: 1,
        designServiceValue: 0,
        operatorJobs: 0,
        tasksOnTime: 1,
        tasksLate: 0,
        onTime: true,
      },
      RATES
    );
    expect(d.omzetPoints).toBe(50);
    expect(d.jobPoints).toBe(30);
    expect(d.taskPoints).toBe(20);
    expect(d.attendancePoints).toBe(10);
    expect(d.total).toBe(110);
  });

  test("desain sulit bernilai lebih tinggi daripada desain mudah", () => {
    // Jasa Desain di PosPro: Easy A Rp15rb, Medium Rp150rb, Hard Rp200rb.
    const easy = computeDayPoints({ ...kosong, designJobs: 1, designServiceValue: 15_000 }, RATES);
    const medium = computeDayPoints({ ...kosong, designJobs: 1, designServiceValue: 150_000 }, RATES);
    const hard = computeDayPoints({ ...kosong, designJobs: 1, designServiceValue: 200_000 }, RATES);
    // 10 poin order + nilai jasa / Rp1.000
    expect(easy.jobPoints).toBe(10 + 15);
    expect(medium.jobPoints).toBe(10 + 150);
    expect(hard.jobPoints).toBe(10 + 200);
    expect(hard.jobPoints).toBeGreaterThan(medium.jobPoints);
    expect(medium.jobPoints).toBeGreaterThan(easy.jobPoints);
  });

  test("satu desain Hard sepadan dengan kerja seharian, bukan sekadar tambahan kecil", () => {
    const hard = computeDayPoints({ ...kosong, designJobs: 1, designServiceValue: 200_000 }, RATES);
    // Sehari penuh: hadir tepat waktu + 3 task + 10 layout materi.
    const hariBiasa = computeDayPoints(
      { ...kosong, designJobs: 10, tasksOnTime: 3, onTime: true },
      RATES
    );
    expect(hard.total).toBeGreaterThan(hariBiasa.total * 0.8);
  });

  test("order tanpa jasa desain tetap dihargai poin order saja", () => {
    expect(computeDayPoints({ ...kosong, designJobs: 1, designServiceValue: 0 }, RATES).jobPoints).toBe(10);
  });

  test("kasir beromzet besar tidak otomatis mengalahkan operator yang rajin", () => {
    const kasir = computeDayPoints({ ...kosong, omzet: 1_000_000, transactions: 20, onTime: true }, RATES);
    const operator = computeDayPoints(
      { ...kosong, operatorJobs: 8, tasksOnTime: 5, onTime: true },
      RATES
    );
    // 100+100+10 = 210  vs  80+100+10 = 190 -> berdekatan, bukan timpang
    expect(kasir.total).toBe(210);
    expect(operator.total).toBe(190);
  });
});

describe("sumPoints", () => {
  test("menjumlahkan beberapa hari per komponen", () => {
    const a = computeDayPoints({ ...kosong, omzet: 100_000, onTime: true }, RATES);
    const b = computeDayPoints({ ...kosong, tasksOnTime: 2 }, RATES);
    const s = sumPoints([a, b]);
    expect(s.omzetPoints).toBe(10);
    expect(s.attendancePoints).toBe(10);
    expect(s.taskPoints).toBe(40);
    expect(s.total).toBe(60);
  });

  test("tanpa hari -> nol", () => {
    expect(sumPoints([]).total).toBe(0);
  });
});

describe("explainRatesByRole", () => {
  const groups = explainRatesByRole(RATES);

  test("dikelompokkan per peran, bukan satu daftar panjang", () => {
    expect(groups.map((g) => g.role)).toEqual(["kasir", "desainer", "operator", "semua"]);
  });

  test("aturan hanya muncul di peran yang memakainya", () => {
    const kasir = groups.find((g) => g.role === "kasir")!;
    const operator = groups.find((g) => g.role === "operator")!;
    const desainer = groups.find((g) => g.role === "desainer")!;

    expect(kasir.items.map((i) => i.label)).toEqual(["Nota / closing"]);
    expect(operator.items.map((i) => i.label)).toEqual(["Kartu produksi"]);
    expect(desainer.items.map((i) => i.label)).toEqual(["Layout materi", "Jasa desain"]);
  });

  test("omzet, task & kehadiran berlaku untuk semua peran", () => {
    const semua = groups.find((g) => g.role === "semua")!;
    expect(semua.items.map((i) => i.label)).toEqual([
      "Omzet yang Anda hasilkan",
      "Task tepat waktu",
      "Task terlambat",
      "Hadir tepat waktu",
    ]);
  });

  test("angkanya mengikuti tarif yang berlaku, bukan hardcode", () => {
    const custom = explainRatesByRole({ ...RATES, perTransaction: 99, perOperatorJob: 77 });
    expect(custom.find((g) => g.role === "kasir")!.items[0].value).toContain("99");
    expect(custom.find((g) => g.role === "operator")!.items[0].value).toContain("77");
  });
});
