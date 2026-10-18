import { prisma } from "@/lib/prisma";
import { requireManager, notFound, route } from "@/lib/http";
import { bacaFoto, responsFoto } from "@/lib/services/reimbursement/simpan";

type Ctx = { params: Promise<{ id: string }> };

/** Foto nota — cuma untuk manajemen yang login. */
export const GET = route<Ctx>(async (_req, ctx) => {
  await requireManager();
  const id = Number((await ctx.params).id) || 0;
  const klaim = await prisma.reimbursement.findUnique({ where: { id }, select: { fotoPath: true } });
  const f = klaim?.fotoPath ? await bacaFoto(klaim.fotoPath) : null;
  if (!f) return notFound("Foto tidak ditemukan.");
  return responsFoto(f);
});
