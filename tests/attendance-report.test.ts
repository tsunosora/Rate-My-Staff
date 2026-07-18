import { describe, expect, test } from "vitest";
import {
  parseTimeToMinutes,
  computeAttendanceRow,
  type DayInput,
} from "@/lib/services/attendance/report";
import { DEFAULT_SHIFT_CONFIG } from "@/lib/services/attendance/shift";

const schedule = {
  startTime: "08:00",
  endTime: "17:00",
  lateToleranceMinutes: 15,
  isHoliday: false,
};

function day(partial: Partial<DayInput>): DayInput {
  return {
    employeeId: 1,
    date: "2026-07-16",
    schedule,
    isHoliday: false,
    scans: [],
    ...partial,
  };
}

describe("parseTimeToMinutes", () => {
  test("HH:mm -> menit", () => {
    expect(parseTimeToMinutes("08:00")).toBe(480);
    expect(parseTimeToMinutes("17:30")).toBe(1050);
    expect(parseTimeToMinutes(null)).toBeNull();
  });
});

describe("computeAttendanceRow", () => {
  test("tepat waktu (dalam toleransi)", () => {
    const r = computeAttendanceRow(
      day({
        scans: [
          { scanDate: "2026-07-16T07:55:00", scanType: "in" },
          { scanDate: "2026-07-16T17:00:00", scanType: "out" },
        ],
      })
    );
    expect(r.status).toBe("on_time");
    expect(r.lateMinutes).toBe(0);
    expect(r.overtimeMinutes).toBe(0);
    expect(r.clockIn).toBe("07:55");
    expect(r.clockOut).toBe("17:00");
  });

  test("terlambat di luar toleransi -> late = selisih dari jam masuk", () => {
    const r = computeAttendanceRow(
      day({
        scans: [
          { scanDate: "2026-07-16T08:30:00", scanType: "in" },
          { scanDate: "2026-07-16T17:00:00", scanType: "out" },
        ],
      })
    );
    expect(r.status).toBe("late");
    expect(r.lateMinutes).toBe(30);
  });

  test("telat masih dalam toleransi -> on_time", () => {
    const r = computeAttendanceRow(
      day({ scans: [{ scanDate: "2026-07-16T08:10:00", scanType: "in" }] })
    );
    expect(r.status).toBe("on_time");
    expect(r.lateMinutes).toBe(0);
  });

  test("lembur = clockOut lewat jam pulang", () => {
    const r = computeAttendanceRow(
      day({
        scans: [
          { scanDate: "2026-07-16T08:00:00", scanType: "in" },
          { scanDate: "2026-07-16T18:30:00", scanType: "out" },
        ],
      })
    );
    expect(r.overtimeMinutes).toBe(90);
  });

  test("tanpa scan & bukan libur -> absent", () => {
    const r = computeAttendanceRow(day({ scans: [] }));
    expect(r.status).toBe("absent");
  });

  test("tanpa scan tapi hari libur -> holiday (bukan absent)", () => {
    const r = computeAttendanceRow(day({ scans: [], isHoliday: true }));
    expect(r.status).toBe("holiday");
  });

  test("record ketidakhadiran (Izin/Sakit/Cuti) -> statusnya dipertahankan", () => {
    const r = computeAttendanceRow(
      day({
        scans: [
          {
            scanDate: "2026-07-16T00:00:00",
            scanType: "absence",
            status: "Izin",
            absenceReason: "Acara keluarga",
          },
        ],
      })
    );
    expect(r.status).toBe("Izin");
    expect(r.absenceReason).toBe("Acara keluarga");
  });

  test("mode shift mengekspos shift kind & isHoliday", () => {
    const r = computeAttendanceRow(
      day({
        date: "2026-04-01",
        schedule: null,
        shiftConfig: DEFAULT_SHIFT_CONFIG,
        scans: [
          { scanDate: "2026-04-01T08:00:00", scanType: "in" },
          { scanDate: "2026-04-01T21:00:00", scanType: "out" },
        ],
      })
    );
    expect(r.shift).toBe("longshift");
    expect(r.isHoliday).toBe(false);
  });

  test("hari libur tanpa scan -> isHoliday true, shift null", () => {
    const r = computeAttendanceRow(
      day({ date: "2026-04-06", schedule: null, isHoliday: true, shiftConfig: DEFAULT_SHIFT_CONFIG, scans: [] })
    );
    expect(r.isHoliday).toBe(true);
    expect(r.shift).toBeNull();
    expect(r.status).toBe("holiday");
  });
});
