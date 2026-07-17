import { prisma } from "@/lib/prisma";
import { requireSession, json, badRequest, route } from "@/lib/http";
import { manualAttendanceSchema } from "@/lib/validators/attendance";
import { computeAttendanceRow } from "@/lib/services/attendance/report";

function at(dateStr: string, time: string): Date {
  return new Date(`${dateStr}T${time}:00`);
}

/** Buat/update record scan in & out manual untuk 1 karyawan pada 1 tanggal. */
export const POST = route(async (req: Request) => {
  await requireSession();
  const body = await req.json().catch(() => null);
  const parsed = manualAttendanceSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const { employeeId, date, clockIn, clockOut } = parsed.data;

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, deletedAt: null },
    include: { workSchedule: true },
  });
  if (!employee) return badRequest({ employeeId: ["Karyawan tidak ditemukan"] });

  const schedule = employee.workSchedule
    ? {
        startTime: employee.workSchedule.startTime,
        endTime: employee.workSchedule.endTime,
        lateToleranceMinutes: employee.workSchedule.lateToleranceMinutes,
        isHoliday: employee.workSchedule.isHoliday,
      }
    : null;

  const scans = [];
  if (clockIn) scans.push({ scanDate: at(date, clockIn), scanType: "in" });
  if (clockOut) scans.push({ scanDate: at(date, clockOut), scanType: "out" });
  if (scans.length === 0) return badRequest({ clockIn: ["Isi minimal jam masuk atau pulang"] });

  const row = computeAttendanceRow({
    employeeId,
    date,
    schedule,
    isHoliday: false,
    scans: scans.map((s) => ({ scanDate: s.scanDate, scanType: s.scanType })),
  });

  const { start, end } = {
    start: new Date(`${date}T00:00:00`),
    end: new Date(new Date(`${date}T00:00:00`).getTime() + 86400000),
  };

  // Hapus record lama pada tanggal itu untuk karyawan, ganti dengan yang baru.
  await prisma.attendance.deleteMany({
    where: { employeeId, scanDate: { gte: start, lt: end } },
  });
  const created = await prisma.attendance.createMany({
    data: scans.map((s) => ({
      employeeId,
      scanDate: s.scanDate,
      scanType: s.scanType,
      status: row.status,
      lateMinutes: s.scanType === "in" ? row.lateMinutes : 0,
      overtimeMinutes: s.scanType === "out" ? row.overtimeMinutes : 0,
      machineName: "manual",
    })),
  });

  return json({ ok: true, created: created.count, row }, { status: 201 });
});
