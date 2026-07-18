import { prisma } from "@/lib/prisma";
import { requireSession, json, route } from "@/lib/http";
import { buildAllReceipts } from "@/lib/services/attendance/receipt-source";

/** Rekap ringkas semua karyawan (untuk pratinjau sebelum export massal). */
export const GET = route(async (req: Request) => {
  await requireSession();
  const sp = new URL(req.url).searchParams;
  const now = new Date();
  const year = Number(sp.get("year")) || now.getFullYear();
  const month = Number(sp.get("month")) || now.getMonth() + 1;
  const departmentId = sp.get("department_id");

  const all = await buildAllReceipts(prisma, year, month, departmentId ? Number(departmentId) : null);
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
