import type { PrismaClient, Prisma } from "@prisma/client";
import { computeAttendanceRow } from "./report";
import { loadShiftConfig } from "./shift";
import { getSetting } from "@/lib/settings";

/**
 * Hitung ulang status/telat/lembur yang TERSIMPAN di baris Attendance.
 *
 * Scan dari mesin dulu disimpan dengan `status: "on_time"` mati — nilainya tak pernah
 * dihitung. Laporan Absensi memang menghitung sendiri saat ditampilkan, tapi halaman
 * "Log Absensi" membaca kolom tersimpan, sehingga semua orang tampak tepat waktu
 * walau datang jam 09.44.
 *
 * Fungsi ini memakai logika yang SAMA dengan laporan (computeAttendanceRow) supaya
 * kedua halaman tak pernah lagi berbeda.
 */
export async function recomputeStoredStatus(
  prisma: PrismaClient,
  opts: { employeeIds?: number[]; from?: Date; machineNames?: string[] } = {}
): Promise<number> {
  const where: Prisma.AttendanceWhereInput = {
    ...(opts.machineNames ? { machineName: { in: opts.machineNames } } : {}),
    ...(opts.employeeIds ? { employeeId: { in: opts.employeeIds } } : {}),
    ...(opts.from ? { scanDate: { gte: opts.from } } : {}),
  };

  const rows = await prisma.attendance.findMany({
    where,
    select: {
      id: true,
      employeeId: true,
      scanDate: true,
      scanType: true,
      status: true,
      lateMinutes: true,
      overtimeMinutes: true,
      absenceReason: true,
    },
    orderBy: { scanDate: "asc" },
  });
  if (rows.length === 0) return 0;

  const dateKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  // Kelompokkan per karyawan-per hari: status satu hari lahir dari jam masuk & pulang.
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = `${r.employeeId}|${dateKey(r.scanDate)}`;
    const arr = groups.get(key) ?? [];
    arr.push(r);
    groups.set(key, arr);
  }

  const employeeIds = [...new Set(rows.map((r) => r.employeeId))];
  const dates = [...new Set(rows.map((r) => dateKey(r.scanDate)))];

  const [employees, holidays, autoSundayRaw, shiftConfig] = await Promise.all([
    prisma.employee.findMany({
      where: { id: { in: employeeIds } },
      select: { id: true, workSchedule: true },
    }),
    prisma.holiday.findMany({
      where: {
        date: {
          gte: new Date(`${dates.reduce((a, b) => (a < b ? a : b))}T00:00:00`),
          lte: new Date(`${dates.reduce((a, b) => (a > b ? a : b))}T23:59:59`),
        },
      },
      select: { date: true },
    }),
    getSetting("auto_sunday_holiday"),
    loadShiftConfig(),
  ]);

  const scheduleOf = new Map(
    employees.map((e) => [
      e.id,
      e.workSchedule
        ? {
            startTime: e.workSchedule.startTime,
            endTime: e.workSchedule.endTime,
            lateToleranceMinutes: e.workSchedule.lateToleranceMinutes,
            isHoliday: e.workSchedule.isHoliday,
            flexibleHours: e.workSchedule.flexibleHours,
          }
        : null,
    ])
  );
  const holidaySet = new Set(holidays.map((h) => dateKey(h.date)));
  const autoSunday = autoSundayRaw === "true";

  let updated = 0;
  for (const [key, scans] of groups) {
    const [empIdStr, date] = key.split("|");
    const employeeId = Number(empIdStr);
    const isHoliday =
      holidaySet.has(date) || (autoSunday && new Date(`${date}T00:00:00`).getDay() === 0);

    const computed = computeAttendanceRow({
      employeeId,
      date,
      schedule: scheduleOf.get(employeeId) ?? null,
      isHoliday,
      shiftConfig,
      scans: scans.map((s) => ({
        scanDate: s.scanDate,
        scanType: s.scanType,
        status: s.status,
        absenceReason: s.absenceReason,
      })),
    });

    for (const s of scans) {
      // Telat menempel di scan masuk, lembur di scan pulang — seragam dengan input manual.
      const late = s.scanType === "in" ? computed.lateMinutes : 0;
      const overtime = s.scanType === "out" ? computed.overtimeMinutes : 0;
      if (
        s.status === computed.status &&
        s.lateMinutes === late &&
        s.overtimeMinutes === overtime
      ) {
        continue;
      }
      await prisma.attendance.update({
        where: { id: s.id },
        data: { status: computed.status, lateMinutes: late, overtimeMinutes: overtime },
      });
      updated++;
    }
  }

  return updated;
}
