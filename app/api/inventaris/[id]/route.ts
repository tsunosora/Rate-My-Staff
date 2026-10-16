import { prisma } from "@/lib/prisma";
import { requireSession, requireManager, json, badRequest, notFound, route } from "@/lib/http";
import { cekJumlahBaru, hitungBarang, inventarisUpdateSchema } from "@/lib/services/inventaris";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/inventaris/[id] — satu barang + seluruh riwayat peminjamannya (terbaru dulu). */
export const GET = route<Ctx>(async (_req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  const b = await prisma.inventarisKantor.findUnique({
    where: { id: Number(id) },
    include: {
      peminjaman: {
        orderBy: { dipinjamPada: "desc" },
        include: { employee: { select: { id: true, fullName: true } } },
      },
    },
  });
  if (!b) return notFound("Barang tidak ditemukan");
  return json({
    ...b,
    ...hitungBarang(b),
    peminjaman: b.peminjaman.map((p) => ({
      id: p.id,
      employeeId: p.employee.id,
      nama: p.employee.fullName,
      jumlah: p.jumlah,
      dipinjamPada: p.dipinjamPada,
      dikembalikanPada: p.dikembalikanPada,
      kondisiKembali: p.kondisiKembali,
      catatan: p.catatan,
    })),
  });
});

/** PUT /api/inventaris/[id] — ubah data barang (nama, kategori, jumlah, rusak/hilang, aktif). */
export const PUT = route<Ctx>(async (req, ctx) => {
  await requireManager();
  const { id } = await ctx.params;
  const parsed = inventarisUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const d = parsed.data;

  const b = await prisma.inventarisKantor.findUnique({
    where: { id: Number(id) },
    include: { peminjaman: { where: { dikembalikanPada: null }, select: { jumlah: true, dikembalikanPada: true } } },
  });
  if (!b) return notFound("Barang tidak ditemukan");

  const { dipegang } = hitungBarang(b);
  const jumlah = d.jumlah ?? b.jumlah;
  const rusakHilang = d.rusakHilang ?? b.rusakHilang;
  const salah = cekJumlahBaru(jumlah, rusakHilang, dipegang);
  if (salah) return badRequest({ jumlah: [salah] });
  if (d.aktif === false && dipegang > 0)
    return badRequest({ aktif: [`Masih ${dipegang} unit dipegang karyawan. Catat kembali dulu sebelum menonaktifkan.`] });

  const baru = await prisma.inventarisKantor.update({
    where: { id: b.id },
    data: {
      nama: d.nama,
      kategori: d.kategori,
      keterangan: d.keterangan === undefined ? undefined : d.keterangan || null,
      jumlah,
      rusakHilang,
      aktif: d.aktif,
    },
  });
  return json(baru);
});
