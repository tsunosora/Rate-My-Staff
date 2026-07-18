import { prisma } from "@/lib/prisma";
import { requireSession, route, notFound } from "@/lib/http";
import { buildEmployeeReceipt, buildAllReceipts } from "@/lib/services/attendance/receipt-source";
import { buildReceiptExcel } from "@/lib/services/export/receipt-excel";
import type { ReceiptData } from "@/lib/services/attendance/receipt";

export const GET = route(async (req: Request) => {
  await requireSession();
  const sp = new URL(req.url).searchParams;
  const now = new Date();
  const year = Number(sp.get("year")) || now.getFullYear();
  const month = Number(sp.get("month")) || now.getMonth() + 1;
  const employeeId = sp.get("employee_id");
  const departmentId = sp.get("department_id");

  const receipts: ReceiptData[] = employeeId
    ? ([await buildEmployeeReceipt(prisma, Number(employeeId), year, month)].filter(Boolean) as ReceiptData[])
    : await buildAllReceipts(prisma, year, month, departmentId ? Number(departmentId) : null);
  if (receipts.length === 0) return notFound("Tidak ada data");

  const buffer = await buildReceiptExcel(receipts);
  const name = employeeId ? `struk-${employeeId}-${year}-${month}` : `struk-massal-${year}-${month}`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}.xlsx"`,
    },
  });
});
