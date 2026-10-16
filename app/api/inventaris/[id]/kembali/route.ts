import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, notFound, route } from "@/lib/http";
import { kembaliSchema } from "@/lib/services/inventaris";

type Ctx = { params: Promise<{ id: string }> };

/**
 * POST /api/inventaris/[id]/kembali — catat barang kembali. Kondisi rusak/hilang memindahkan
 * unitnya ke hitungan rusak/hilang, jadi tidak muncul lagi sebagai tersedia.
 */
export const POST = route<Ctx>(async (req, ctx) => {
  await requireManager();
  const { id } = await ctx.params;
  const parsed = kembaliSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const d = parsed.data;

  const p = await prisma.peminjamanInventaris.findFirst({
    where: { id: d.peminjamanId, inventarisId: Number(id) },
  });
  if (!p) return notFound("Peminjaman tidak ditemukan");
  if (p.dikembalikanPada) return badRequest({ peminjamanId: ["Barang ini sudah dicatat kembali"] });

  const berhasil = await prisma.$transaction(async (tx) => {
    // Bersyarat "belum kembali": dua klik bersamaan tidak menghitung rusak/hilang dua kali.
    const u = await tx.peminjamanInventaris.updateMany({
      where: { id: p.id, dikembalikanPada: null },
      data: { dikembalikanPada: new Date(), kondisiKembali: d.kondisi, catatan: d.catatan || p.catatan },
    });
    if (u.count === 0) return false;
    if (d.kondisi !== "baik") {
      await tx.inventarisKantor.update({
        where: { id: p.inventarisId },
        data: { rusakHilang: { increment: p.jumlah } },
      });
    }
    return true;
  });
  if (!berhasil) return badRequest({ peminjamanId: ["Barang ini sudah dicatat kembali"] });
  return json({ ok: true });
});
