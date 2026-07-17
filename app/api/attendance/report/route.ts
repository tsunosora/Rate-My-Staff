import { prisma } from "@/lib/prisma";
import { requireSession, json, route } from "@/lib/http";
import { aggregateAttendance } from "@/lib/services/attendance/aggregate";

export const GET = route(async (req: Request) => {
  await requireSession();
  const sp = new URL(req.url).searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const result = await aggregateAttendance(prisma, {
    startStr: sp.get("start_date") ?? today,
    endStr: sp.get("end_date") ?? today,
    departmentId: sp.get("department_id"),
    employeeId: sp.get("employee_id"),
  });
  return json(result);
});
