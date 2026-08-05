import { prisma } from "@/lib/prisma";
import { requireSession, json, badRequest, notFound, route } from "@/lib/http";
import { buildEmployeeReceipt } from "@/lib/services/attendance/receipt-source";
import { resolveReceiptPeriod } from "@/lib/services/attendance/period";

export const GET = route(async (req: Request) => {
  await requireSession();
  const sp = new URL(req.url).searchParams;
  const employeeId = Number(sp.get("employee_id"));
  if (!employeeId) return badRequest({ message: "employee_id wajib" });
  const period = resolveReceiptPeriod(sp);
  const data = await buildEmployeeReceipt(prisma, employeeId, period);
  if (!data) return notFound("Karyawan tidak ditemukan");
  return json(data);
});
