import { prisma } from "@/lib/prisma";
import { requireAdmin, json, notFound, route } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Batalkan pembayaran (hanya owner/admin): lepaskan ikatan baris & penyesuaiannya lalu hapus
 * catatan pembayarannya. Barisnya kembali "belum dibayar" dan bisa diubah lagi.
 */
export const DELETE = route<Ctx>(async (_req, ctx) => {
  await requireAdmin();
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return notFound("Pembayaran tidak ditemukan.");
  const hasil = await prisma.$transaction(async (tx) => {
    const p = await tx.pembayaranUpah.findUnique({ where: { id }, select: { id: true } });
    if (!p) return null;
    const baris = await tx.rekapHarian.updateMany({ where: { pembayaranId: id }, data: { pembayaranId: null } });
    const penyesuaian = await tx.penyesuaianUpah.updateMany({ where: { pembayaranId: id }, data: { pembayaranId: null } });
    await tx.pembayaranUpah.delete({ where: { id } });
    return { baris: baris.count, penyesuaian: penyesuaian.count };
  });
  if (!hasil) return notFound("Pembayaran tidak ditemukan.");
  return json({ ok: true, ...hasil });
});
