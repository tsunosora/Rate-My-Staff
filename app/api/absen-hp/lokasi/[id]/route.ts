import { randomBytes, randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, notFound, route } from "@/lib/http";
import { ubahLokasiSchema as ubahSchema } from "@/lib/services/absen-hp/skema";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route<Ctx>(async (req, ctx) => {
  await requireManager();
  const id = Number((await ctx.params).id);
  const parsed = ubahSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const { gantiLayar, ...data } = parsed.data;
  const ada = await prisma.absenLokasi.findUnique({ where: { id }, select: { id: true } });
  if (!ada) return notFound("Lokasi tidak ditemukan.");
  await prisma.absenLokasi.update({
    where: { id },
    data: { ...data, ...(gantiLayar ? { qrRahasia: randomBytes(32).toString("hex"), layarToken: randomUUID() } : {}) },
  });
  return json({ ok: true });
});

/**
 * Hapus lokasi. Bukti absen lama TETAP ada (lokasiId jadi kosong) — riwayat kehadiran tidak boleh
 * ikut hilang karena toko tutup. Kalau cuma mau berhenti dipakai sementara, nonaktifkan saja.
 */
export const DELETE = route<Ctx>(async (_req, ctx) => {
  await requireManager();
  const id = Number((await ctx.params).id);
  await prisma.absenLokasi.delete({ where: { id } }).catch(() => null);
  return json({ ok: true });
});
