import { describe, expect, test } from "vitest";
import {
  buatPetaJadwal,
  cekRentang,
  infoJadwal,
  jadwalHari,
  liburUmum,
  pisahSimpan,
  rencanaIsiMassal,
  rencanaSalin,
  seninDari,
  tambahHari,
  tanggalTerawal,
  MAKS_HARI_RENTANG,
  type Bawaan,
  type BarisRoster,
  type WorkScheduleLike,
} from "@/lib/services/jadwal-shift/aturan";
import { buildReport, computeAttendanceRow, type DayInput, type ScheduleInfo } from "@/lib/services/attendance/report";
import { buildImportPreview, type ImportEmployee } from "@/lib/services/attendance/import-map";
import { DEFAULT_SHIFT_CONFIG, type ShiftConfig } from "@/lib/services/attendance/shift";
import type { ParsedScanRow } from "@/lib/services/attendance/import-html";

const PAGI: WorkScheduleLike = { id: 1, startTime: "08:00", endTime: "16:00", lateToleranceMinutes: 10, isHoliday: false, flexibleHours: false };
const SIANG: WorkScheduleLike = { id: 2, startTime: "13:00", endTime: "21:00", lateToleranceMinutes: 10, isHoliday: false, flexibleHours: false };
const BEBAS: WorkScheduleLike = { id: 3, startTime: null, endTime: null, lateToleranceMinutes: 0, isHoliday: false, flexibleHours: true };

const bawaanPagi: Bawaan = { id: 1, schedule: infoJadwal(PAGI) };

describe("jadwalHari", () => {
  test("tanpa roster = jadwal tetap", () => {
    const h = jadwalHari(bawaanPagi, null);
    expect(h).toEqual({ schedule: infoJadwal(PAGI), workScheduleId: 1, libur: false, sumber: "bawaan", catatan: null });
  });
  test("roster dengan jadwal lain menang", () => {
    const r: BarisRoster = { employeeId: 5, tanggal: "2026-10-19", workScheduleId: 2, libur: false, workSchedule: SIANG };
    const h = jadwalHari(bawaanPagi, r);
    expect(h.schedule?.startTime).toBe("13:00");
    expect(h.workScheduleId).toBe(2);
    expect(h.sumber).toBe("roster");
    expect(h.libur).toBe(false);
  });
  test("roster libur tanpa jadwal: libur, jadwal tetap dipakai bila ternyata masuk", () => {
    const h = jadwalHari(bawaanPagi, { employeeId: 5, tanggal: "2026-10-19", workScheduleId: null, libur: true });
    expect(h.libur).toBe(true);
    expect(h.schedule?.startTime).toBe("08:00");
    expect(h.sumber).toBe("roster");
  });
  test("baris tanpa jadwal & tanpa libur (mis. jadwalnya dihapus permanen) = bawaan", () => {
    const h = jadwalHari(bawaanPagi, { employeeId: 5, tanggal: "2026-10-19", workScheduleId: null, libur: false });
    expect(h.sumber).toBe("bawaan");
  });
  test("karyawan tanpa jadwal tetap + roster", () => {
    const h = jadwalHari({ id: null, schedule: null }, { employeeId: 5, tanggal: "2026-10-19", workScheduleId: 3, libur: false, workSchedule: BEBAS });
    expect(h.schedule?.flexibleHours).toBe(true);
  });
});

describe("buatPetaJadwal", () => {
  const peta = buatPetaJadwal(new Map([[5, bawaanPagi]]), [
    { employeeId: 5, tanggal: "2026-10-20", workScheduleId: 2, libur: false, workSchedule: SIANG },
  ]);
  test("hari bertanda roster vs hari lain", () => {
    expect(peta.get(5, "2026-10-20").workScheduleId).toBe(2);
    expect(peta.get(5, "2026-10-21").workScheduleId).toBe(1);
    expect(peta.jumlahRoster).toBe(1);
  });
  test("karyawan tak dikenal = tanpa jadwal", () => {
    expect(peta.get(99, "2026-10-20").schedule).toBeNull();
  });
});

describe("liburUmum", () => {
  test("libur nasional & Minggu otomatis", () => {
    expect(liburUmum("2026-08-17", new Set(["2026-08-17"]), false)).toBe(true);
    expect(liburUmum("2026-10-18", new Set(), true)).toBe(true); // Minggu
    expect(liburUmum("2026-10-18", new Set(), false)).toBe(false);
    expect(liburUmum("2026-10-19", new Set(), true)).toBe(false);
  });
});

describe("pisahSimpan", () => {
  test("null & bukan libur = hapus; ganda = yang terakhir menang", () => {
    const r = pisahSimpan([
      { employeeId: 1, tanggal: "2026-10-19", workScheduleId: 2, libur: false },
      { employeeId: 1, tanggal: "2026-10-19", workScheduleId: null, libur: false },
      { employeeId: 1, tanggal: "2026-10-20", workScheduleId: null, libur: true, catatan: "  " },
      { employeeId: 2, tanggal: "2026-10-20", workScheduleId: 1, libur: false, catatan: " tukar " },
    ]);
    expect(r.hapus).toEqual([{ employeeId: 1, tanggal: "2026-10-19" }]);
    expect(r.simpan).toEqual([
      { employeeId: 1, tanggal: "2026-10-20", workScheduleId: null, libur: true, catatan: null },
      { employeeId: 2, tanggal: "2026-10-20", workScheduleId: 1, libur: false, catatan: "tukar" },
    ]);
  });
});

describe("rencanaIsiMassal", () => {
  test("satu jadwal untuk semua sel", () => {
    const s = rencanaIsiMassal({ employeeIds: [1, 2, 2], dari: "2026-10-19", sampai: "2026-10-21", pola: [{ workScheduleId: 2, libur: false }] });
    expect(s).toHaveLength(6); // id ganda tidak dobel
    expect(s.every((x) => x.workScheduleId === 2)).toBe(true);
  });
  test("pola berputar per hari kalender", () => {
    const s = rencanaIsiMassal({
      employeeIds: [1],
      dari: "2026-10-19",
      sampai: "2026-10-23",
      pola: [
        { workScheduleId: 1, libur: false },
        { workScheduleId: 2, libur: false },
        { workScheduleId: null, libur: true },
      ],
    });
    expect(s.map((x) => (x.libur ? "L" : x.workScheduleId))).toEqual([1, 2, "L", 1, 2]);
  });
  test("saring hari: cuma Sabtu & Minggu; urutan pola tetap per tanggal", () => {
    const s = rencanaIsiMassal({
      employeeIds: [1],
      dari: "2026-10-19", // Senin
      sampai: "2026-10-25", // Minggu
      pola: [{ workScheduleId: null, libur: true }],
      hari: [6, 0],
    });
    expect(s.map((x) => x.tanggal)).toEqual(["2026-10-24", "2026-10-25"]);
  });
  test("pola kosong = tidak ada sel", () => {
    expect(rencanaIsiMassal({ employeeIds: [1], dari: "2026-10-19", sampai: "2026-10-20", pola: [] })).toEqual([]);
  });
});

describe("rencanaSalin (minggu lalu ke minggu ini)", () => {
  const sumber = [
    { employeeId: 1, tanggal: "2026-10-12", workScheduleId: 2, libur: false },
    { employeeId: 1, tanggal: "2026-10-18", workScheduleId: null, libur: true, catatan: "tukar" },
    { employeeId: 2, tanggal: "2026-10-13", workScheduleId: 1, libur: false },
    { employeeId: 3, tanggal: "2026-10-13", workScheduleId: 1, libur: false }, // tidak dipilih
  ];
  test("timpa: hasil persis salinan, sisa tujuan dikembalikan ke bawaan", () => {
    const s = rencanaSalin({
      employeeIds: [1, 2],
      dariSumber: "2026-10-12",
      dariTujuan: "2026-10-19",
      jumlahHari: 7,
      sumber,
      tujuanAda: [
        { employeeId: 1, tanggal: "2026-10-19" },
        { employeeId: 2, tanggal: "2026-10-22" },
        { employeeId: 3, tanggal: "2026-10-22" },
      ],
      timpa: true,
    });
    const byKey = Object.fromEntries(s.map((x) => [`${x.employeeId}|${x.tanggal}`, x]));
    expect(byKey["1|2026-10-19"]).toMatchObject({ workScheduleId: 2, libur: false });
    expect(byKey["1|2026-10-25"]).toMatchObject({ workScheduleId: null, libur: true, catatan: "tukar" });
    expect(byKey["2|2026-10-20"]).toMatchObject({ workScheduleId: 1 });
    expect(byKey["2|2026-10-22"]).toMatchObject({ workScheduleId: null, libur: false }); // dikembalikan
    expect(byKey["3|2026-10-22"]).toBeUndefined(); // karyawan lain tidak disentuh
    expect(s).toHaveLength(4);
  });
  test("tanpa timpa: sel tujuan yang sudah berisi dibiarkan", () => {
    const s = rencanaSalin({
      employeeIds: [1, 2],
      dariSumber: "2026-10-12",
      dariTujuan: "2026-10-19",
      jumlahHari: 7,
      sumber,
      tujuanAda: [{ employeeId: 1, tanggal: "2026-10-19" }],
      timpa: false,
    });
    expect(s.map((x) => `${x.employeeId}|${x.tanggal}`).sort()).toEqual(["1|2026-10-25", "2|2026-10-20"]);
  });
});

describe("tanggal", () => {
  test("seninDari", () => {
    expect(seninDari("2026-10-18")).toBe("2026-10-12"); // Minggu -> Senin sebelumnya
    expect(seninDari("2026-10-19")).toBe("2026-10-19");
    expect(seninDari("2026-10-22")).toBe("2026-10-19");
  });
  test("tambahHari melintasi bulan", () => {
    expect(tambahHari("2026-10-30", 3)).toBe("2026-11-02");
    expect(tambahHari("2026-10-19", -7)).toBe("2026-10-12");
  });
  test("cekRentang", () => {
    expect(cekRentang("2026-10-19", "2026-10-25")).toEqual({ ok: true, hari: 7 });
    expect(cekRentang("2026-10-25", "2026-10-19").ok).toBe(false);
    expect(cekRentang("2026-10-01", tambahHari("2026-10-01", MAKS_HARI_RENTANG)).ok).toBe(false);
    expect(cekRentang("2026-10-01", tambahHari("2026-10-01", MAKS_HARI_RENTANG - 1)).ok).toBe(true);
    expect(cekRentang("19-10-2026", "2026-10-25").ok).toBe(false);
  });
  test("tanggalTerawal", () => {
    expect(tanggalTerawal([{ tanggal: "2026-10-20" }, { tanggal: "2026-10-03" }])).toBe("2026-10-03");
    expect(tanggalTerawal([])).toBeNull();
  });
});

// ─────────────────── Regresi: tanpa roster, hasil laporan TIDAK berubah ───────────────────

const SHIFT: ShiftConfig = DEFAULT_SHIFT_CONFIG;

function hariContoh(): Omit<DayInput, "schedule" | "isHoliday">[] {
  const at = (d: string, t: string) => new Date(`${d}T${t}:00`);
  return [
    { employeeId: 1, date: "2026-10-19", scans: [{ scanDate: at("2026-10-19", "08:25"), scanType: "in" }, { scanDate: at("2026-10-19", "17:10"), scanType: "out" }] },
    { employeeId: 1, date: "2026-10-20", scans: [] },
    { employeeId: 1, date: "2026-10-18", scans: [{ scanDate: at("2026-10-18", "07:55"), scanType: "in" }] },
    { employeeId: 2, date: "2026-10-19", scans: [{ scanDate: at("2026-10-19", "13:30"), scanType: "in" }, { scanDate: at("2026-10-19", "22:00"), scanType: "out" }] },
    { employeeId: 3, date: "2026-10-19", scans: [{ scanDate: at("2026-10-19", "09:00"), scanType: "in" }, { scanDate: at("2026-10-19", "20:30"), scanType: "out" }] },
    { employeeId: 2, date: "2026-10-21", scans: [{ scanDate: at("2026-10-21", "08:00"), scanType: "absence", status: "Sakit" }] },
  ];
}

describe("regresi: tanpa roster = hasil sama dengan jadwal tetap", () => {
  const tetap = new Map<number, WorkScheduleLike | null>([[1, PAGI], [2, SIANG], [3, BEBAS]]);
  const peta = buatPetaJadwal(
    new Map([...tetap].map(([id, ws]) => [id, { id: ws?.id ?? null, schedule: infoJadwal(ws) }])),
    []
  );
  const libur = new Set(["2026-10-20"]);

  for (const shiftConfig of [null, SHIFT]) {
    test(`buildReport identik (shiftConfig=${shiftConfig ? "ada" : "tidak"})`, () => {
      const lama: DayInput[] = hariContoh().map((d) => ({
        ...d,
        schedule: infoJadwal(tetap.get(d.employeeId)) as ScheduleInfo | null,
        isHoliday: liburUmum(d.date, libur, true),
        shiftConfig,
      }));
      const baru: DayInput[] = hariContoh().map((d) => {
        const h = peta.get(d.employeeId, d.date);
        return { ...d, schedule: h.schedule, isHoliday: liburUmum(d.date, libur, true) || h.libur, shiftConfig };
      });
      expect(buildReport(baru)).toEqual(buildReport(lama));
    });
  }

  test("import preview: jadwalHari kosong/null = hasil lama", () => {
    const employees: ImportEmployee[] = [
      { id: 1, machinePin: "11", fullName: "Andi", workSchedule: infoJadwal(PAGI) },
      { id: 2, machinePin: "22", fullName: "Budi", workSchedule: infoJadwal(SIANG) },
    ];
    const parsed: ParsedScanRow[] = [
      { pin: "11", name: "Andi", dateISO: "2026-10-19", scans: ["08:30:00", "17:00:00"] },
      { pin: "22", name: "Budi", dateISO: "2026-10-19", scans: ["13:20:00", "21:40:00"] },
      { pin: "99", name: "X", dateISO: "2026-10-19", scans: ["08:00:00"] },
    ];
    const lama = buildImportPreview(parsed, employees, { holidayDates: new Set(), autoSunday: true });
    const denganNull = buildImportPreview(parsed, employees, { holidayDates: new Set(), autoSunday: true, jadwalHari: null });
    const denganPeta = buildImportPreview(parsed, employees, {
      holidayDates: new Set(),
      autoSunday: true,
      jadwalHari: (id, d) => buatPetaJadwal(new Map([[1, bawaanPagi], [2, { id: 2, schedule: infoJadwal(SIANG) }]]), []).get(id, d),
    });
    expect(denganNull).toEqual(lama);
    expect(denganPeta).toEqual(lama);
  });
});

describe("roster mengubah hasil hari itu", () => {
  const at = (t: string) => new Date(`2026-10-19T${t}:00`);
  test("dijadwal siang: masuk 13.05 tepat waktu, bukan telat dari jadwal pagi", () => {
    const peta = buatPetaJadwal(new Map([[1, bawaanPagi]]), [
      { employeeId: 1, tanggal: "2026-10-19", workScheduleId: 2, libur: false, workSchedule: SIANG },
    ]);
    const h = peta.get(1, "2026-10-19");
    const row = computeAttendanceRow({
      employeeId: 1,
      date: "2026-10-19",
      schedule: h.schedule,
      isHoliday: h.libur,
      scans: [{ scanDate: at("13:05"), scanType: "in" }, { scanDate: at("21:30"), scanType: "out" }],
    });
    expect(row.status).toBe("on_time");
    expect(row.lateMinutes).toBe(0);
    expect(row.overtimeMinutes).toBe(30);
  });
  test("libur roster tanpa scan = holiday (bukan absent)", () => {
    const peta = buatPetaJadwal(new Map([[1, bawaanPagi]]), [
      { employeeId: 1, tanggal: "2026-10-19", workScheduleId: null, libur: true },
    ]);
    const h = peta.get(1, "2026-10-19");
    const row = computeAttendanceRow({ employeeId: 1, date: "2026-10-19", schedule: h.schedule, isHoliday: h.libur, scans: [] });
    expect(row.status).toBe("holiday");
  });
  test("libur roster tapi masuk: baris ditandai hari libur, seperti tanggal merah", () => {
    const row = computeAttendanceRow({
      employeeId: 1,
      date: "2026-10-19",
      schedule: infoJadwal(PAGI),
      isHoliday: true,
      scans: [{ scanDate: at("08:00"), scanType: "in" }, { scanDate: at("16:00"), scanType: "out" }],
    });
    expect(row.isHoliday).toBe(true);
  });
  test("import preview memakai roster", () => {
    const employees: ImportEmployee[] = [{ id: 1, machinePin: "11", fullName: "Andi", workSchedule: infoJadwal(PAGI) }];
    const parsed: ParsedScanRow[] = [{ pin: "11", name: "Andi", dateISO: "2026-10-19", scans: ["13:05:00", "21:00:00"] }];
    const peta = buatPetaJadwal(new Map([[1, bawaanPagi]]), [
      { employeeId: 1, tanggal: "2026-10-19", workScheduleId: 2, libur: false, workSchedule: SIANG },
    ]);
    const lama = buildImportPreview(parsed, employees);
    const baru = buildImportPreview(parsed, employees, { jadwalHari: (id, d) => peta.get(id, d) });
    expect(lama.rows[0].status).toBe("late");
    expect(baru.rows[0].status).toBe("on_time");
  });
});
