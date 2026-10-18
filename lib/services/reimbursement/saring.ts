import type { Prisma } from "@prisma/client";
import { STATUS, rentangBulan, type StatusReimburse } from "./aturan";

/**
 * Saringan daftar dasbor dari query string: status, bulan (YYYY-MM, berdasar tanggal
 * pengeluaran), employee_id. Dipakai daftar DAN ekspor supaya isinya selalu sama.
 */
export function saringan(sp: URLSearchParams): { where: Prisma.ReimbursementWhereInput; bulan: string | null } {
  const status = sp.get("status");
  const employeeId = Number(sp.get("employee_id"));
  const bulan = sp.get("bulan");
  const r = bulan ? rentangBulan(bulan) : null;
  return {
    where: {
      ...(status && (STATUS as readonly string[]).includes(status) ? { status: status as StatusReimburse } : {}),
      ...(Number.isInteger(employeeId) && employeeId > 0 ? { employeeId } : {}),
      ...(r ? { tanggal: { gte: r.mulai, lt: r.akhir } } : {}),
    },
    bulan: r ? bulan : null,
  };
}
