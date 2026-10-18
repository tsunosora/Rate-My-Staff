import { prisma } from "@/lib/prisma";
import { notFound, requireManager, route } from "@/lib/http";
import { bacaFoto } from "@/lib/services/kunjungan/simpan";

type Ctx = { params: Promise<{ id: string }> };

/** Foto kunjungan — cuma untuk manajemen yang login. Tidak pernah di-cache publik. */
export const GET = route<Ctx>(async (_req, ctx) => {
  await requireManager();
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return notFound("Foto tidak ditemukan.");
  const k = await prisma.kunjunganKlien.findUnique({ where: { id }, select: { masukFoto: true } });
  const f = k?.masukFoto ? await bacaFoto(k.masukFoto) : null;
  if (!f) return notFound("Foto tidak ditemukan.");
  return new Response(new Uint8Array(f.bita), {
    headers: {
      "Content-Type": f.tipe,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
