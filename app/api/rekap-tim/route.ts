import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, route } from "@/lib/http";
import { dariYmd, teksAtauNull } from "@/lib/services/upah/aturan";
import { bacaSaring, idPengguna, kelompokkan, pilihBaris, whereRekap } from "@/lib/services/upah/rekap";
import { tambahRekapSchema } from "@/lib/services/upah/skema";

/**
 * Rekap harian tukang untuk persetujuan, dikelompokkan per tanggal → per tim.
 * `?dari=&sampai=` (YYYY-MM-DD, bawaan hari ini, maks 31 hari), `?timId=<id>|tanpa`,
 * `?persetujuan=menunggu|disetujui|ditolak`, `?employeeId=`.
 * `dimuatAt` dikirim balik saat "setujui semua": baris yang diubah PIC sesudahnya tidak ikut.
 */
export const GET = route(async (req) => {
  await requireManager();
  const saring = bacaSaring(new URL(req.url).searchParams);
  if ("galat" in saring) return badRequest({ formErrors: [saring.galat] });
  const dimuatAt = new Date();
  const [baris, menunggu] = await Promise.all([
    prisma.rekapHarian.findMany({ where: whereRekap(saring), select: pilihBaris, orderBy: [{ tanggal: "desc" }, { id: "asc" }] }),
    prisma.rekapHarian.count({ where: whereRekap({ ...saring, persetujuan: "menunggu" }) }),
  ]);
  return json({
    dari: saring.rentang.dariYmd,
    sampai: saring.rentang.sampaiYmd,
    dimuatAt: dimuatAt.toISOString(),
    menunggu,
    hari: kelompokkan(baris),
  });
});

/**
 * Tambah baris manual oleh admin (mis. PIC lupa mencatat). sumber "admin", langsung disetujui.
 * Satu orang satu baris per hari: kalau sudah ada, ubah baris yang ada.
 */
export const POST = route(async (req) => {
  const session = await requireManager();
  const parsed = tambahRekapSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const d = parsed.data;
  const tanggal = dariYmd(d.tanggal);
  if (!tanggal) return badRequest({ formErrors: ["Tanggal tidak dikenal."] });

  const orang = await prisma.employee.findFirst({ where: { id: d.employeeId, deletedAt: null }, select: { id: true } });
  if (!orang) return badRequest({ formErrors: ["Karyawan tidak ditemukan."] });
  if (d.proyekId && !(await prisma.proyekKerja.findUnique({ where: { id: d.proyekId }, select: { id: true } }))) {
    return badRequest({ formErrors: ["Proyek tidak ditemukan."] });
  }

  try {
    const b = await prisma.rekapHarian.create({
      data: {
        employeeId: d.employeeId,
        tanggal,
        status: d.status,
        lemburJam: d.lemburJam,
        kota: teksAtauNull(d.kota, 100),
        divisi: teksAtauNull(d.divisi, 100),
        proyekId: d.proyekId ?? null,
        catatan: teksAtauNull(d.catatan, 255),
        sumber: "admin",
        persetujuan: "disetujui",
        decidedById: await idPengguna(session.user?.email),
        decidedAt: new Date(),
      },
      select: { id: true },
    });
    return json({ ok: true, id: b.id }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return json({ message: "Orang ini sudah punya rekap di tanggal itu. Ubah baris yang ada." }, { status: 409 });
    }
    throw e;
  }
});
