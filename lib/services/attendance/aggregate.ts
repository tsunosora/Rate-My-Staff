import type { PrismaClient, Prisma } from "@prisma/client";
import { buildReport, type DayInput } from "./report";
import { loadShiftConfig } from "./shift";
import { getSetting } from "@/lib/settings";

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function eachDate(start: Date, end: Date): string[] {
  const out: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    out.push(dateKey(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export type AttendanceReportParams = {
  startStr: string;
  endStr: string;
  departmentId?: string | null;
  employeeId?: string | null;
};

export type AttendanceReportResult = {
  rows: (ReturnType<typeof buildReport>[number] & { fullName: string; department: string | null })[];
  summary: {
    totalRows: number;
    late: number;
    absent: number;
    onTime: number;
    longshift: number;
    totalLateMinutes: number;
    totalOvertimeMinutes: number;
  };
};

/** Agregasi laporan absensi untuk rentang tanggal × karyawan (dipakai route report & export). */
export async function aggregateAttendance(
  prisma: PrismaClient,
  { startStr, endStr, departmentId, employeeId }: AttendanceReportParams
): Promise<AttendanceReportResult> {
  const start = new Date(`${startStr}T00:00:00`);
  const end = new Date(`${endStr}T00:00:00`);
  const rangeEnd = new Date(end.getTime() + 86400000);

  const empWhere: Prisma.EmployeeWhereInput = { deletedAt: null, isActive: true };
  if (departmentId) empWhere.departmentId = Number(departmentId);
  if (employeeId) empWhere.id = Number(employeeId);

  const employees = await prisma.employee.findMany({
    where: empWhere,
    include: { workSchedule: true, department: true },
    orderBy: { fullName: "asc" },
  });

  const attendances = await prisma.attendance.findMany({
    where: {
      employeeId: { in: employees.map((e) => e.id) },
      scanDate: { gte: start, lt: rangeEnd },
    },
    orderBy: { scanDate: "asc" },
  });

  const holidays = await prisma.holiday.findMany({ where: { date: { gte: start, lt: rangeEnd } } });
  const holidaySet = new Set(holidays.map((h) => dateKey(h.date)));
  const autoSunday = (await getSetting("auto_sunday_holiday")) === "true";
  const shiftConfig = await loadShiftConfig();

  const byEmpDate = new Map<string, typeof attendances>();
  for (const a of attendances) {
    const key = `${a.employeeId}|${dateKey(a.scanDate)}`;
    const arr = byEmpDate.get(key) ?? [];
    arr.push(a);
    byEmpDate.set(key, arr);
  }

  const allDates = eachDate(start, end);
  const showAllDates = Boolean(employeeId);

  const days: (DayInput & { fullName: string; department: string | null })[] = [];
  for (const emp of employees) {
    const schedule = emp.workSchedule
      ? {
          startTime: emp.workSchedule.startTime,
          endTime: emp.workSchedule.endTime,
          lateToleranceMinutes: emp.workSchedule.lateToleranceMinutes,
          isHoliday: emp.workSchedule.isHoliday,
          flexibleHours: emp.workSchedule.flexibleHours,
        }
      : null;
    for (const date of allDates) {
      const scans = byEmpDate.get(`${emp.id}|${date}`) ?? [];
      if (!showAllDates && scans.length === 0) continue;
      const isHoliday =
        holidaySet.has(date) || (autoSunday && new Date(`${date}T00:00:00`).getDay() === 0);
      days.push({
        employeeId: emp.id,
        fullName: emp.fullName,
        department: emp.department?.name ?? null,
        date,
        schedule,
        isHoliday,
        shiftConfig,
        scans: scans.map((s) => ({
          scanDate: s.scanDate,
          scanType: s.scanType,
          status: s.status,
          absenceReason: s.absenceReason,
        })),
      });
    }
  }

  // `...r` menyertakan shift & isHoliday (dari buildReport) — dipakai oleh struk absensi.
  const rows = buildReport(days).map((r, idx) => ({
    ...r,
    fullName: days[idx].fullName,
    department: days[idx].department,
  }));

  const summary = {
    totalRows: rows.length,
    late: rows.filter((r) => r.status === "late").length,
    absent: rows.filter((r) => r.status === "absent").length,
    onTime: rows.filter((r) => r.status === "on_time").length,
    longshift: rows.filter((r) => r.status === "longshift").length,
    totalLateMinutes: rows.reduce((s, r) => s + r.lateMinutes, 0),
    totalOvertimeMinutes: rows.reduce((s, r) => s + r.overtimeMinutes, 0),
  };

  return { rows, summary };
}
