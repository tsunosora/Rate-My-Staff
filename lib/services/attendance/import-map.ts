import { computeAttendanceRow, type ScheduleInfo } from "./report";
import { computeShift, suggestMissingTime, type ShiftConfig, type ShiftKind } from "./shift";
import type { ParsedScanRow } from "./import-html";

export type DerivedScan = { time: string; scanType: "in" | "out" };

/** "HH:MM:SS" -> detik sejak 00:00. */
function toSec(t: string): number {
  const [h, m, s] = t.split(":").map(Number);
  return (h || 0) * 3600 + (m || 0) * 60 + (s || 0);
}

/**
 * Dobel-scan di event yang sama (mis. 08:00 & 08:05, atau 21:00 & 21:06) dianggap satu event.
 * Scan dalam jarak <= CLUSTER_GAP dikelompokkan; wakil tiap kelompok = scan PALING TERLAMBAT.
 * Aman: jarak masuk↔pulang selalu berjam-jam, jauh di atas ambang ini.
 */
const CLUSTER_GAP_SEC = 120 * 60; // 2 jam

/** "HH:MM" -> menit. */
function hmMin(t: string): number {
  return Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
}

/**
 * Klasifikasi satu scan (tanpa pasangan) → masuk/pulang.
 * Dengan shiftConfig: masuk bila lebih dekat ke awal shift (08:00/13:00), pulang bila lebih dekat
 * ke akhir shift (16:00/21:00). Tanpa config: heuristik jam (sebelum noonHour = masuk).
 */
function classifySingle(time: string, noonHour: number, cfg?: ShiftConfig | null): "in" | "out" {
  if (!cfg) return Number(time.slice(0, 2)) < noonHour ? "in" : "out";
  const t = hmMin(`${time.slice(0, 5)}`);
  const starts = [hmMin(cfg.storeOpen), hmMin(cfg.afternoonStart)];
  const ends = [hmMin(cfg.morningEnd), hmMin(cfg.storeClose)];
  const dStart = Math.min(...starts.map((s) => Math.abs(t - s)));
  const dEnd = Math.min(...ends.map((e) => Math.abs(t - e)));
  return dStart <= dEnd ? "in" : "out";
}

/** Reduksi 1–4 punch → masuk & pulang, setelah dobel-scan digabung (ambil paling terlambat). */
export function deriveScans(
  scans: string[],
  noonHour = 12,
  shiftConfig?: ShiftConfig | null
): DerivedScan[] {
  const clean = scans.filter(Boolean).slice().sort((a, b) => toSec(a) - toSec(b));
  if (clean.length === 0) return [];

  // Kelompokkan scan berdekatan; ambil yang paling terlambat sebagai wakil.
  const reps: string[] = [];
  let clusterStart: string | null = null;
  for (const t of clean) {
    if (clusterStart !== null && toSec(t) - toSec(clusterStart) <= CLUSTER_GAP_SEC) {
      reps[reps.length - 1] = t; // event sama → geser ke scan yang lebih baru
    } else {
      reps.push(t);
      clusterStart = t;
    }
  }

  if (reps.length === 1) {
    return [{ time: reps[0], scanType: classifySingle(reps[0], noonHour, shiftConfig) }];
  }
  return [
    { time: reps[0], scanType: "in" },
    { time: reps[reps.length - 1], scanType: "out" },
  ];
}

export type ImportEmployee = {
  id: number;
  machinePin: string | null; // PIN terdaftar di mesin absensi (dicocokkan ke kolom PIN file)
  fullName: string;
  workSchedule: ScheduleInfo | null;
};

export type ImportPreviewRow = {
  pin: string;
  fileName: string; // nama di file
  employeeId: number | null;
  employeeName: string | null; // nama di DB
  dateISO: string;
  clockIn: string | null;
  clockOut: string | null;
  status: string;
  shift: string | null; // "pagi" | "siang" | "longshift" (null bila tak cocok / mode jadwal)
  suggested: string | null; // saran jam yang hilang (bila absensi tidak komplit), "HH:MM"
  lateMinutes: number;
  overtimeMinutes: number;
  isHoliday: boolean;
  matched: boolean;
};

export type ImportPreview = {
  rows: ImportPreviewRow[];
  summary: {
    total: number;
    matched: number;
    unmatched: number;
    unmatchedPins: string[];
  };
};

export type PreviewOptions = {
  holidayDates?: Set<string>; // YYYY-MM-DD custom (dari tabel Holiday)
  autoSunday?: boolean; // setting auto_sunday_holiday
  noonHour?: number;
  shiftConfig?: ShiftConfig | null; // jam toko & shift (mode otomatis)
};

/** "HH:MM" -> menit. */
function hm(t: string): number {
  return Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
}

/** Rumus libur sama persis dgn aggregateAttendance. */
export function isHolidayDate(dateISO: string, opts: PreviewOptions): boolean {
  if (opts.holidayDates?.has(dateISO)) return true;
  if (opts.autoSunday && new Date(`${dateISO}T00:00:00`).getDay() === 0) return true;
  return false;
}

/** Gabung baris parsed + daftar karyawan → preview attendance per baris. */
export function buildImportPreview(
  parsed: ParsedScanRow[],
  employees: ImportEmployee[],
  opts: PreviewOptions = {}
): ImportPreview {
  const byPin = new Map(
    employees.filter((e) => e.machinePin).map((e) => [e.machinePin as string, e])
  );
  const rows: ImportPreviewRow[] = [];
  const unmatchedPins = new Set<string>();

  for (const r of parsed) {
    const holiday = isHolidayDate(r.dateISO, opts);
    const emp = byPin.get(r.pin) ?? null;
    if (!emp) {
      unmatchedPins.add(r.pin);
      rows.push({
        pin: r.pin,
        fileName: r.name,
        employeeId: null,
        employeeName: null,
        dateISO: r.dateISO,
        clockIn: null,
        clockOut: null,
        status: "unmatched",
        shift: null,
        suggested: null,
        lateMinutes: 0,
        overtimeMinutes: 0,
        isHoliday: holiday,
        matched: false,
      });
      continue;
    }

    const derived = deriveScans(r.scans, opts.noonHour ?? 12, opts.shiftConfig ?? null);
    const computed = computeAttendanceRow({
      employeeId: emp.id,
      date: r.dateISO,
      schedule: emp.workSchedule,
      isHoliday: holiday,
      shiftConfig: opts.shiftConfig ?? null,
      scans: derived.map((d) => ({
        scanDate: new Date(`${r.dateISO}T${d.time}`),
        scanType: d.scanType,
      })),
    });

    let shift: ShiftKind | null = null;
    if (opts.shiftConfig && (computed.clockIn || computed.clockOut)) {
      shift = computeShift(
        computed.clockIn ? hm(computed.clockIn) : null,
        computed.clockOut ? hm(computed.clockOut) : null,
        opts.shiftConfig
      ).shift;
    }

    // Saran jam yang hilang bila absensi tidak komplit (hanya masuk / hanya pulang).
    let suggested: string | null = null;
    if (opts.shiftConfig && shift && !!computed.clockIn !== !!computed.clockOut) {
      suggested = suggestMissingTime(shift, computed.clockIn ? "out" : "in", opts.shiftConfig);
    }

    rows.push({
      pin: r.pin,
      fileName: r.name,
      employeeId: emp.id,
      employeeName: emp.fullName,
      dateISO: r.dateISO,
      clockIn: computed.clockIn,
      clockOut: computed.clockOut,
      status: computed.status,
      shift,
      suggested,
      lateMinutes: computed.lateMinutes,
      overtimeMinutes: computed.overtimeMinutes,
      isHoliday: holiday,
      matched: true,
    });
  }

  return {
    rows,
    summary: {
      total: parsed.length,
      matched: rows.filter((x) => x.matched).length,
      unmatched: rows.filter((x) => !x.matched).length,
      unmatchedPins: [...unmatchedPins],
    },
  };
}
