import { prisma } from "@/lib/prisma";
import { requireManager, json, notFound, route } from "@/lib/http";

type Ctx = { params: Promise<{ id: string }> };

/** Hapus penyesuaian yang BELUM dibayar. Yang sudah dibayar terkunci (batalkan pembayarannya dulu). */
export const DELETE = route<Ctx>(async (_req, ctx) => {
  await requireManager();
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return notFound("Penyesuaian tidak ditemukan.");
  const r = await prisma.penyesuaianUpah.deleteMany({ where: { id, pembayaranId: null } });
  if (r.count === 0) {
    const ada = await prisma.penyesuaianUpah.findUnique({ where: { id }, select: { id: true } });
    if (!ada) return notFound("Penyesuaian tidak ditemukan.");
    return json({ message: "Penyesuaian ini sudah dibayar, jadi tidak bisa dihapus." }, { status: 409 });
  }
  return json({ ok: true });
});
