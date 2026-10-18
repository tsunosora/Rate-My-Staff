import { prisma } from "@/lib/prisma";
import { requireManager, notFound, route } from "@/lib/http";
import { bacaFotoTim } from "@/lib/services/absen-tim/simpan";

type Ctx = { params: Promise<{ id: string }> };

/** Foto absen tim — cuma untuk manajemen yang login. Tidak pernah di-cache publik. */
export const GET = route<Ctx>(async (_req, ctx) => {
  await requireManager();
  const id = Number((await ctx.params).id);
  const b = Number.isInteger(id) && id > 0
    ? await prisma.absenTimBaris.findUnique({ where: { id }, select: { fotoPath: true } })
    : null;
  const f = b ? await bacaFotoTim(b.fotoPath) : null;
  if (!f) return notFound("Foto tidak ditemukan.");
  return new Response(new Uint8Array(f.bita), {
    headers: {
      "Content-Type": f.tipe,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
