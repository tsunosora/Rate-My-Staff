import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, route } from "@/lib/http";
import { timesheetAdminSchema } from "@/lib/validators/timesheet";
import {
  daftarKaryawan,
  filterAdminDari,
  saranProyekUsaha,
  serializeEntri,
  simpanEntri,
  whereAdmin,
} from "@/lib/services/timesheet/service";

const PER_HALAMAN = 50;

/** Daftar entri timesheet untuk owner, dengan saringan karyawan, proyek, dan rentang. */
export const GET = route(async (req: Request) => {
  await requireManager();
  const sp = new URL(req.url).searchParams;
  const f = filterAdminDari(sp);
  const halaman = Math.max(1, Number(sp.get("page") ?? 1) || 1);
  const where = whereAdmin(f);

  const [items, total, jumlah, karyawan, proyek] = await Promise.all([
    prisma.timesheetEntri.findMany({
      where,
      orderBy: [{ tanggal: "desc" }, { mulai: "desc" }, { id: "desc" }],
      skip: (halaman - 1) * PER_HALAMAN,
      take: PER_HALAMAN,
      include: { employee: { select: { fullName: true, employeeCode: true } } },
    }),
    prisma.timesheetEntri.count({ where }),
    prisma.timesheetEntri.aggregate({ where, _sum: { menit: true } }),
    daftarKaryawan(prisma),
    saranProyekUsaha(prisma),
  ]);

  return json({
    filter: f,
    items: items.map((e) => ({
      ...serializeEntri(e),
      employeeName: e.employee.fullName,
      employeeCode: e.employee.employeeCode,
    })),
    total,
    totalMenit: jumlah._sum.menit ?? 0,
    page: halaman,
    perPage: PER_HALAMAN,
    karyawan,
    proyek,
  });
});

/** Owner menambah catatan atas nama karyawan (sumber "admin"; tanpa batas 14 hari). */
export const POST = route(async (req: Request) => {
  await requireManager();
  const parsed = timesheetAdminSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const emp = await prisma.employee.findFirst({
    where: { id: parsed.data.employeeId, deletedAt: null },
    select: { id: true },
  });
  if (!emp) return badRequest({ employeeId: ["Karyawan tidak ditemukan"] });

  const hasil = await simpanEntri(prisma, {
    employeeId: emp.id,
    input: parsed.data,
    sumber: "admin",
    tanpaBatasMundur: true,
  });
  if (!hasil.ok) return NextResponse.json({ message: hasil.message }, { status: hasil.status });
  return json(serializeEntri(hasil.entri), { status: 201 });
});
