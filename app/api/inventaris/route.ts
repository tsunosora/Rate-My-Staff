import { prisma } from "@/lib/prisma";
import { requireSession, requireManager, json, badRequest, route } from "@/lib/http";
import { hitungBarang, inventarisCreateSchema, ringkasInventaris } from "@/lib/services/inventaris";

/**
 * GET /api/inventaris — barang kantor yang dipinjamkan ke karyawan, dengan hitungan
 * dipegang/tersedia/rusak-hilang per barang dan totalnya. `?semua=1` ikut barang nonaktif.
 */
export const GET = route(async (req: Request) => {
  await requireSession();
  const semua = new URL(req.url).searchParams.get("semua") === "1";
  const barang = await prisma.inventarisKantor.findMany({
    where: semua ? {} : { aktif: true },
    orderBy: [{ kategori: "asc" }, { nama: "asc" }],
    include: {
      peminjaman: {
        where: { dikembalikanPada: null },
        orderBy: { dipinjamPada: "asc" },
        include: { employee: { select: { id: true, fullName: true } } },
      },
    },
  });

  const items = barang.map((b) => {
    const h = hitungBarang(b);
    return {
      id: b.id,
      nama: b.nama,
      kategori: b.kategori,
      keterangan: b.keterangan,
      jumlah: b.jumlah,
      aktif: b.aktif,
      ...h,
      pemegang: b.peminjaman.map((p) => ({
        peminjamanId: p.id,
        employeeId: p.employee.id,
        nama: p.employee.fullName,
        jumlah: p.jumlah,
        sejak: p.dipinjamPada,
        catatan: p.catatan,
      })),
    };
  });
  return json({ items, ringkasan: ringkasInventaris(items) });
});

/** POST /api/inventaris — tambah barang. Manajemen saja. */
export const POST = route(async (req: Request) => {
  await requireManager();
  const parsed = inventarisCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const d = parsed.data;
  const b = await prisma.inventarisKantor.create({
    data: { nama: d.nama, kategori: d.kategori, keterangan: d.keterangan || null, jumlah: d.jumlah },
  });
  return json(b, { status: 201 });
});
