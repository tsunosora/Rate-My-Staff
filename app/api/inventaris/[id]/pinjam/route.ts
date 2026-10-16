import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, notFound, route } from "@/lib/http";
import { hitungBarang, pinjamSchema } from "@/lib/services/inventaris";

type Ctx = { params: Promise<{ id: string }> };

/** POST /api/inventaris/[id]/pinjam — serahkan unit ke karyawan. Ditolak bila stok tersedia kurang. */
export const POST = route<Ctx>(async (req, ctx) => {
  await requireManager();
  const { id } = await ctx.params;
  const parsed = pinjamSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const d = parsed.data;

  const karyawan = await prisma.employee.findFirst({
    where: { id: d.employeeId, deletedAt: null },
    select: { id: true },
  });
  if (!karyawan) return badRequest({ employeeId: ["Karyawan tidak ditemukan"] });

  // Cek stok dan catat dalam satu transaksi (tanpa DDL) supaya dua serah-terima bersamaan
  // tidak sama-sama memakai unit terakhir.
  const hasil = await prisma.$transaction(async (tx) => {
    const b = await tx.inventarisKantor.findUnique({
      where: { id: Number(id) },
      include: { peminjaman: { where: { dikembalikanPada: null }, select: { jumlah: true, dikembalikanPada: true } } },
    });
    if (!b || !b.aktif) return { gagal: "tidak-ada" as const, tersedia: 0 };
    const { tersedia } = hitungBarang(b);
    if (d.jumlah > tersedia) return { gagal: "kurang" as const, tersedia };
    const p = await tx.peminjamanInventaris.create({
      data: { inventarisId: b.id, employeeId: d.employeeId, jumlah: d.jumlah, catatan: d.catatan || null },
    });
    return { gagal: null, p };
  });

  if (hasil.gagal === "tidak-ada") return notFound("Barang tidak ditemukan");
  if (hasil.gagal === "kurang") return badRequest({ jumlah: [`Hanya ${hasil.tersedia} unit tersedia`] });
  return json(hasil.p, { status: 201 });
});
