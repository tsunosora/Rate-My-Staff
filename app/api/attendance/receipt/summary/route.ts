import { prisma } from "@/lib/prisma";
import { requireSession, json, route } from "@/lib/http";
import { buildAllReceipts } from "@/lib/services/attendance/receipt-source";
import { resolveReceiptPeriod } from "@/lib/services/attendance/period";

/** Rekap ringkas semua karyawan (untuk pratinjau sebelum export massal). */
export const GET = route(async (req: Request) => {
  await requireSession();
  const sp = new URL(req.url).searchParams;
  const period = resolveReceiptPeriod(sp);
  const departmentId = sp.get("department_id");

  const all = await buildAllReceipts(prisma, period, departmentId ? Number(departmentId) : null);
  return json(
    all.map((r) => ({
      employeeId: r.employeeId,
      employeeName: r.employeeName,
      employeeCode: r.employeeCode,
      department: r.department,
      totals: r.totals,
    }))
  );
});
