import { describe, expect, test } from "vitest";
import { computeShift, suggestMissingTime, DEFAULT_SHIFT_CONFIG } from "@/lib/services/attendance/shift";
import { buildImportPreview, deriveScans, type ImportEmployee } from "@/lib/services/attendance/import-map";

const hm = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

describe("computeShift", () => {
  test("shift pagi tepat waktu + lembur lewat 16:00", () => {
    // masuk 07:59, pulang 16:50
    expect(computeShift(hm("07:59"), hm("16:50"))).toEqual({
      shift: "pagi",
      status: "on_time",
      lateMinutes: 0,
      overtimeMinutes: 50,
    });
  });

  test("shift siang tepat waktu + lembur lewat 21:00", () => {
    expect(computeShift(hm("13:02"), hm("21:29"))).toEqual({
      shift: "siang",
      status: "on_time",
      lateMinutes: 0,
      overtimeMinutes: 29,
    });
  });

  test("longshift: masuk pagi & pulang saat tutup (>= 20:00)", () => {
    expect(computeShift(hm("08:01"), hm("21:00"))).toEqual({
      shift: "longshift",
      status: "longshift",
      lateMinutes: 0,
      overtimeMinutes: 0, // 21:00 tidak lewat tutup 21:00
    });
  });

  test("longshift dengan lembur setelah tutup toko", () => {
    expect(computeShift(hm("08:00"), hm("21:37"))).toMatchObject({
      shift: "longshift",
      overtimeMinutes: 37,
    });
  });

  test("telat shift pagi (di atas toleransi 15 menit)", () => {
    expect(computeShift(hm("08:30"), hm("16:00"))).toEqual({
      shift: "pagi",
      status: "late",
      lateMinutes: 30,
      overtimeMinutes: 0,
    });
  });

  test("telat shift siang", () => {
    expect(computeShift(hm("13:20"), hm("21:00"))).toMatchObject({
      shift: "siang",
      status: "late",
      lateMinutes: 20,
    });
  });

  test("satu scan saja (pulang null) tetap terklasifikasi", () => {
    expect(computeShift(hm("08:10"), null)).toMatchObject({ shift: "pagi", status: "on_time" });
    expect(computeShift(hm("13:30"), null)).toMatchObject({ shift: "siang", status: "late" });
  });

  test("dalam toleransi tidak dihitung telat", () => {
    expect(computeShift(hm("08:12"), hm("16:00")).status).toBe("on_time");
  });
});

describe("buildImportPreview dengan shiftConfig", () => {
  const employees: ImportEmployee[] = [
    { id: 10, machinePin: "5", fullName: "Luluk Zahro", workSchedule: null },
  ];

  test("memakai deteksi shift (abaikan jadwal per-karyawan)", () => {
    const rows = [{ pin: "5", name: "LULUK Z", dateISO: "2026-05-02", scans: ["07:59:18", "16:50:50"] }];
    const { rows: preview } = buildImportPreview(rows, employees, { shiftConfig: DEFAULT_SHIFT_CONFIG });
    expect(preview[0]).toMatchObject({
      shift: "pagi",
      status: "on_time",
      clockIn: "07:59",
      clockOut: "16:50",
      overtimeMinutes: 50,
    });
  });

  test("mendeteksi longshift dari file", () => {
    const rows = [{ pin: "5", name: "LULUK Z", dateISO: "2026-05-02", scans: ["08:01:00", "21:05:00"] }];
    const { rows: preview } = buildImportPreview(rows, employees, { shiftConfig: DEFAULT_SHIFT_CONFIG });
    expect(preview[0]).toMatchObject({ shift: "longshift", status: "longshift", overtimeMinutes: 5 });
  });

  test("satu scan sore (21:00) → masuk KOSONG, bukan 'masuk 21 pulang 21'", () => {
    const rows = [{ pin: "5", name: "LULUK Z", dateISO: "2026-05-02", scans: ["21:00:34"] }];
    const { rows: preview } = buildImportPreview(rows, employees, { shiftConfig: DEFAULT_SHIFT_CONFIG });
    expect(preview[0].clockIn).toBeNull();
    expect(preview[0].clockOut).toBe("21:00");
  });

  test("satu scan jam 13 (mulai shift siang) → dianggap MASUK, bukan pulang", () => {
    const rows = [{ pin: "5", name: "LULUK Z", dateISO: "2026-05-02", scans: ["13:03:00"] }];
    const { rows: preview } = buildImportPreview(rows, employees, { shiftConfig: DEFAULT_SHIFT_CONFIG });
    expect(preview[0].clockIn).toBe("13:03");
    expect(preview[0].clockOut).toBeNull();
    expect(preview[0].shift).toBe("siang");
  });
});

describe("deriveScans klasifikasi shift-aware (satu scan)", () => {
  const cfg = DEFAULT_SHIFT_CONFIG;
  test("08:00 → masuk (dekat buka)", () => {
    expect(deriveScans(["08:00:00"], 12, cfg)).toEqual([{ time: "08:00:00", scanType: "in" }]);
  });
  test("13:00 → masuk (mulai shift siang), bukan pulang", () => {
    expect(deriveScans(["13:00:00"], 12, cfg)).toEqual([{ time: "13:00:00", scanType: "in" }]);
  });
  test("16:00 → pulang (akhir shift pagi)", () => {
    expect(deriveScans(["16:00:00"], 12, cfg)).toEqual([{ time: "16:00:00", scanType: "out" }]);
  });
  test("21:00 → pulang (tutup toko)", () => {
    expect(deriveScans(["21:00:00"], 12, cfg)).toEqual([{ time: "21:00:00", scanType: "out" }]);
  });
});

describe("computeShift tanpa jam masuk (lupa absen masuk)", () => {
  test("hanya pulang 21:00 → siang, tidak telat, tidak lembur", () => {
    expect(computeShift(null, 21 * 60)).toMatchObject({
      shift: "siang",
      status: "on_time",
      lateMinutes: 0,
      overtimeMinutes: 0,
    });
  });
});

describe("suggestMissingTime (auto-isi jam yang hilang)", () => {
  test("pulang 16:00 (pagi) → saran masuk 08:00", () => {
    expect(suggestMissingTime("pagi", "in")).toBe("08:00");
  });
  test("pulang 21:00 (siang) → saran masuk 13:00", () => {
    expect(suggestMissingTime("siang", "in")).toBe("13:00");
  });
  test("masuk 08:00 (pagi) → saran pulang 16:00", () => {
    expect(suggestMissingTime("pagi", "out")).toBe("16:00");
  });
  test("masuk 13:00 (siang) → saran pulang 21:00", () => {
    expect(suggestMissingTime("siang", "out")).toBe("21:00");
  });
  test("longshift → masuk 08:00 / pulang 21:00", () => {
    expect(suggestMissingTime("longshift", "in")).toBe("08:00");
    expect(suggestMissingTime("longshift", "out")).toBe("21:00");
  });
});

describe("buildImportPreview menyertakan saran jam yang hilang", () => {
  const emps: ImportEmployee[] = [
    { id: 10, machinePin: "5", fullName: "Luluk", workSchedule: null },
  ];
  test("hanya scan pulang 16:00 → suggested 08:00 (masuk pagi)", () => {
    const rows = [{ pin: "5", name: "L", dateISO: "2026-05-04", scans: ["16:00:00"] }];
    const { rows: pv } = buildImportPreview(rows, emps, { shiftConfig: DEFAULT_SHIFT_CONFIG });
    expect(pv[0]).toMatchObject({ clockIn: null, clockOut: "16:00", suggested: "08:00" });
  });
  test("hanya scan pulang 21:00 → suggested 13:00 (masuk siang)", () => {
    const rows = [{ pin: "5", name: "L", dateISO: "2026-05-04", scans: ["21:00:00"] }];
    const { rows: pv } = buildImportPreview(rows, emps, { shiftConfig: DEFAULT_SHIFT_CONFIG });
    expect(pv[0]).toMatchObject({ clockIn: null, clockOut: "21:00", suggested: "13:00" });
  });
  test("hanya scan masuk 08:00 → suggested 16:00 (pulang pagi)", () => {
    const rows = [{ pin: "5", name: "L", dateISO: "2026-05-04", scans: ["08:00:00"] }];
    const { rows: pv } = buildImportPreview(rows, emps, { shiftConfig: DEFAULT_SHIFT_CONFIG });
    expect(pv[0]).toMatchObject({ clockIn: "08:00", clockOut: null, suggested: "16:00" });
  });
});
