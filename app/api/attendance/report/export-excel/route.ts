import { prisma } from "@/lib/prisma";
import { requireSession, route } from "@/lib/http";
import { aggregateAttendance } from "@/lib/services/attendance/aggregate";
import { buildAttendanceReportExcel } from "@/lib/services/export/excel";

export const GET = route(async (req: Request) => {
  await requireSession();
  const sp = new URL(req.url).searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const { rows } = await aggregateAttendance(prisma, {
    startStr: sp.get("start_date") ?? today,
    endStr: sp.get("end_date") ?? today,
    departmentId: sp.get("department_id"),
    employeeId: sp.get("employee_id"),
  });
  const buffer = await buildAttendanceReportExcel(rows);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="laporan-absensi.xlsx"`,
    },
  });
});
