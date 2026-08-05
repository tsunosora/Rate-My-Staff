import { prisma } from "@/lib/prisma";
import { requireSession, route, notFound } from "@/lib/http";
import { buildEmployeeReceipt, buildAllReceipts } from "@/lib/services/attendance/receipt-source";
import { buildReceiptExcel } from "@/lib/services/export/receipt-excel";
import { resolveReceiptPeriod, periodFileTag } from "@/lib/services/attendance/period";
import type { ReceiptData } from "@/lib/services/attendance/receipt";

export const GET = route(async (req: Request) => {
  await requireSession();
  const sp = new URL(req.url).searchParams;
  const period = resolveReceiptPeriod(sp);
  const employeeId = sp.get("employee_id");
  const departmentId = sp.get("department_id");

  const receipts: ReceiptData[] = employeeId
    ? ([await buildEmployeeReceipt(prisma, Number(employeeId), period)].filter(Boolean) as ReceiptData[])
    : await buildAllReceipts(prisma, period, departmentId ? Number(departmentId) : null);
  if (receipts.length === 0) return notFound("Tidak ada data");

  const buffer = await buildReceiptExcel(receipts);
  const tag = periodFileTag(period);
  const name = employeeId ? `struk-${employeeId}-${tag}` : `struk-massal-${tag}`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}.xlsx"`,
    },
  });
});
