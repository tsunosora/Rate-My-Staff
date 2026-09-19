import { describe, expect, test } from "vitest";
import { computeAttendanceRow } from "@/lib/services/attendance/report";
import { DEFAULT_SHIFT_CONFIG } from "@/lib/services/attendance/shift";

/**
 * Nilai yang DISIMPAN di kolom Attendance harus sama dengan yang dihitung laporan.
 * Dulu scan mesin disimpan dengan status "on_time" mati, sehingga Log Absensi
 * menampilkan semua orang tepat waktu walau datang jam 09.44.
 */
function scan(date: string, jam: string, tipe: "in" | "out") {
  return { scanDate: new Date(`${date}T${jam}:00`), scanType: tipe };
}

describe("status tersimpan harus mengikuti jam scan", () => {
  const base = { employeeId: 1, date: "2026-09-19", schedule: null, isHoliday: false, shiftConfig: DEFAULT_SHIFT_CONFIG };

  test("datang 07.55 -> tepat waktu", () => {
    const r = computeAttendanceRow({ ...base, scans: [scan("2026-09-19", "07:55", "in"), scan("2026-09-19", "16:05", "out")] });
    expect(r.status).toBe("on_time");
    expect(r.lateMinutes).toBe(0);
  });

  test("datang 08.20 -> TERLAMBAT, bukan tepat waktu", () => {
    const r = computeAttendanceRow({ ...base, scans: [scan("2026-09-19", "08:20", "in"), scan("2026-09-19", "16:00", "out")] });
    expect(r.status).toBe("late");
    expect(r.lateMinutes).toBe(20);
  });

  test("datang 09.44 -> terlambat 104 menit", () => {
    const r = computeAttendanceRow({ ...base, scans: [scan("2026-09-19", "09:44", "in"), scan("2026-09-19", "16:00", "out")] });
    expect(r.status).toBe("late");
    expect(r.lateMinutes).toBe(104);
  });

  test("masih dalam toleransi 15 menit -> tetap tepat waktu", () => {
    const r = computeAttendanceRow({ ...base, scans: [scan("2026-09-19", "08:14", "in"), scan("2026-09-19", "16:00", "out")] });
    expect(r.status).toBe("on_time");
  });

  test("shift siang 13.05 -> tepat waktu, bukan terlambat 5 jam", () => {
    const r = computeAttendanceRow({ ...base, scans: [scan("2026-09-19", "13:05", "in"), scan("2026-09-19", "21:00", "out")] });
    expect(r.status).toBe("on_time");
    expect(r.lateMinutes).toBe(0);
  });

  test("masuk pagi pulang tutup -> longshift", () => {
    const r = computeAttendanceRow({ ...base, scans: [scan("2026-09-19", "08:00", "in"), scan("2026-09-19", "21:00", "out")] });
    expect(r.status).toBe("longshift");
  });
});
