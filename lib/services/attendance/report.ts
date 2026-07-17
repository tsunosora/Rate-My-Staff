export type ScheduleInfo = {
  startTime: string | null;
  endTime: string | null;
  lateToleranceMinutes: number;
  isHoliday: boolean;
};

export type ScanInput = {
  scanDate: string | Date;
  scanType: string | null;
  status?: string | null;
  absenceReason?: string | null;
};

export type DayInput = {
  employeeId: number;
  date: string; // YYYY-MM-DD
  schedule: ScheduleInfo | null;
  isHoliday: boolean;
  scans: ScanInput[];
};

export type ReportRow = {
  employeeId: number;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  lateMinutes: number;
  overtimeMinutes: number;
  status: string;
  absenceReason: string | null;
};

const ABSENCE_STATUSES = new Set(["Izin", "Sakit", "Cuti"]);

export function parseTimeToMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(time);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function toDate(d: string | Date): Date {
  return d instanceof Date ? d : new Date(d);
}

function minutesOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

function fmt(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Hitung satu baris laporan untuk satu karyawan pada satu tanggal. */
export function computeAttendanceRow(input: DayInput): ReportRow {
  const base: ReportRow = {
    employeeId: input.employeeId,
    date: input.date,
    clockIn: null,
    clockOut: null,
    lateMinutes: 0,
    overtimeMinutes: 0,
    status: "absent",
    absenceReason: null,
  };

  // 1) Record ketidakhadiran eksplisit (Izin/Sakit/Cuti) menang.
  const absence = input.scans.find(
    (s) => s.scanType === "absence" || (s.status && ABSENCE_STATUSES.has(s.status))
  );
  if (absence) {
    return { ...base, status: absence.status ?? "Izin", absenceReason: absence.absenceReason ?? null };
  }

  // 2) Kumpulkan scan in/out.
  const timed = input.scans
    .filter((s) => s.scanType !== "absence")
    .map((s) => ({ ...s, dt: toDate(s.scanDate) }))
    .sort((a, b) => a.dt.getTime() - b.dt.getTime());

  if (timed.length === 0) {
    return { ...base, status: input.isHoliday || input.schedule?.isHoliday ? "holiday" : "absent" };
  }

  const ins = timed.filter((s) => s.scanType === "in");
  const outs = timed.filter((s) => s.scanType === "out");
  const clockInDt = (ins[0] ?? timed[0]).dt;
  const clockOutDt = (outs.length ? outs[outs.length - 1] : timed[timed.length - 1]).dt;

  const clockIn = fmt(clockInDt);
  const clockOut = timed.length > 1 || outs.length ? fmt(clockOutDt) : null;

  let lateMinutes = 0;
  let overtimeMinutes = 0;
  let status = "on_time";

  const startMin = parseTimeToMinutes(input.schedule?.startTime ?? null);
  const endMin = parseTimeToMinutes(input.schedule?.endTime ?? null);
  const tolerance = input.schedule?.lateToleranceMinutes ?? 0;

  if (startMin !== null) {
    const inMin = minutesOfDay(clockInDt);
    if (inMin > startMin + tolerance) {
      lateMinutes = inMin - startMin;
      status = "late";
    }
  }

  if (endMin !== null && clockOut) {
    const outMin = minutesOfDay(clockOutDt);
    if (outMin > endMin) overtimeMinutes = outMin - endMin;
  }

  return { ...base, clockIn, clockOut, lateMinutes, overtimeMinutes, status, absenceReason: null };
}

/** Bangun laporan untuk banyak input hari (satu per karyawan-tanggal). */
export function buildReport(days: DayInput[]): ReportRow[] {
  return days.map(computeAttendanceRow);
}
