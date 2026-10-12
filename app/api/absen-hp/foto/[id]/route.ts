import { prisma } from "@/lib/prisma";
import { requireManager, notFound, route } from "@/lib/http";
import { bacaFoto } from "@/lib/services/absen-hp/simpan";

type Ctx = { params: Promise<{ id: string }> };

/** Foto bukti absen — cuma untuk manajemen yang login. Tidak pernah di-cache publik. */
export const GET = route<Ctx>(async (_req, ctx) => {
  await requireManager();
  const id = Number((await ctx.params).id);
  const b = await prisma.absenHpBukti.findUnique({ where: { id }, select: { fotoPath: true } });
  const f = b ? await bacaFoto(b.fotoPath) : null;
  if (!f) return notFound("Foto tidak ditemukan.");
  return new Response(new Uint8Array(f.bita), {
    headers: {
      "Content-Type": f.tipe,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
