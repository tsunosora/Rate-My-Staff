import { prisma } from "@/lib/prisma";
import { requireManager, notFound, route } from "@/lib/http";
import { bacaFotoRekap } from "@/lib/services/rekap-tim/foto";

type Ctx = { params: Promise<{ id: string }> };

/** Foto rekap harian — cuma untuk manajemen yang login. Tidak pernah di-cache publik. */
export const GET = route<Ctx>(async (_req, ctx) => {
  await requireManager();
  const id = Number((await ctx.params).id);
  const b = Number.isInteger(id) && id > 0
    ? await prisma.rekapHarian.findUnique({ where: { id }, select: { fotoPath: true } })
    : null;
  const f = b?.fotoPath ? await bacaFotoRekap(b.fotoPath) : null;
  if (!f) return notFound("Foto tidak ditemukan.");
  return new Response(new Uint8Array(f.bita), {
    headers: {
      "Content-Type": f.tipe,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
