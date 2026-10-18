import { prisma } from "@/lib/prisma";
import { requireManager, route } from "@/lib/http";
import { toYmd } from "@/lib/services/leave/service";
import { bangunRekap, filterAdminDari, whereAdmin } from "@/lib/services/timesheet/service";
import { bangunEksporTimesheet } from "@/lib/services/timesheet/ekspor";

/** Ekspor Excel dengan saringan yang sama dengan halaman /timesheet. */
export const GET = route(async (req: Request) => {
  await requireManager();
  const f = filterAdminDari(new URL(req.url).searchParams);
  const [entri, rekap] = await Promise.all([
    prisma.timesheetEntri.findMany({
      where: whereAdmin(f),
      orderBy: [{ tanggal: "asc" }, { employeeId: "asc" }, { mulai: "asc" }],
      include: { employee: { select: { fullName: true, employeeCode: true } } },
    }),
    bangunRekap(prisma, f),
  ]);
  const buffer = await bangunEksporTimesheet(
    entri.map((e) => ({
      tanggal: toYmd(e.tanggal),
      mulai: e.mulai,
      selesai: e.selesai,
      menit: e.menit,
      proyek: e.proyek,
      kegiatan: e.kegiatan,
      catatan: e.catatan,
      sumber: e.sumber,
      employeeName: e.employee.fullName,
      employeeCode: e.employee.employeeCode,
    })),
    rekap
  );
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="timesheet-${f.dari}_${f.sampai}.xlsx"`,
    },
  });
});
