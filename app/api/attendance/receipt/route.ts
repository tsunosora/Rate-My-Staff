import { prisma } from "@/lib/prisma";
import { requireSession, json, badRequest, notFound, route } from "@/lib/http";
import { buildEmployeeReceipt } from "@/lib/services/attendance/receipt-source";

export const GET = route(async (req: Request) => {
  await requireSession();
  const sp = new URL(req.url).searchParams;
  const employeeId = Number(sp.get("employee_id"));
  const now = new Date();
  const year = Number(sp.get("year")) || now.getFullYear();
  const month = Number(sp.get("month")) || now.getMonth() + 1;
  if (!employeeId || month < 1 || month > 12)
    return badRequest({ message: "employee_id & month wajib" });
  const data = await buildEmployeeReceipt(prisma, employeeId, year, month);
  if (!data) return notFound("Karyawan tidak ditemukan");
  return json(data);
});
