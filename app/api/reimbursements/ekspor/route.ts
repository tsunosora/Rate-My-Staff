import { prisma } from "@/lib/prisma";
import { requireManager, route } from "@/lib/http";
import { saringan } from "@/lib/services/reimbursement/saring";
import { bangunEksporReimbursement } from "@/lib/services/reimbursement/ekspor";
import { serialisasi } from "@/lib/services/reimbursement/service";
import { toYmd } from "@/lib/services/leave/service";

/**
 * Ekspor Excel. Bawaan = bulan ini (berdasar tanggal pengeluaran); saringan status & karyawan
 * dari daftar ikut dipakai supaya isi berkas sama dengan yang dilihat owner.
 */
export const GET = route(async (req: Request) => {
  await requireManager();
  const sp = new URL(req.url).searchParams;
  if (!sp.get("bulan")) sp.set("bulan", toYmd(new Date()).slice(0, 7));
  const { where, bulan } = saringan(sp);

  const rows = await prisma.reimbursement.findMany({
    where,
    orderBy: [{ tanggal: "asc" }, { id: "asc" }],
    include: {
      employee: { select: { fullName: true, employeeCode: true, department: { select: { name: true } } } },
    },
  });
  const buffer = await bangunEksporReimbursement(
    rows.map((r) => ({
      ...serialisasi(r),
      employeeName: r.employee.fullName,
      employeeCode: r.employee.employeeCode,
      department: r.employee.department?.name ?? null,
    })),
    `Rekap reimbursement ${bulan ?? ""}`.trim()
  );
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reimbursement-${bulan ?? "semua"}.xlsx"`,
    },
  });
});
