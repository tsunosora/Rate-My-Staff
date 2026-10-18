import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, notFound, route } from "@/lib/http";
import { teksAtauNull } from "@/lib/services/upah/aturan";
import { upahKhususSchema } from "@/lib/services/upah/skema";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Upah khusus satu baris rekap (tambahan rupiah di luar tarif, mis. kerja di ketinggian). Diatur di
 * layar upah, bukan layar persetujuan, karena isinya rupiah. Kosong/0 = tanpa upah khusus.
 * Tidak mengubah persetujuan. Baris yang sudah dibayar terkunci.
 */
export const PATCH = route<Ctx>(async (req, ctx) => {
  await requireManager();
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return notFound("Baris tidak ditemukan.");
  const parsed = upahKhususSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const jumlah = parsed.data.upahKhusus ? Math.round(parsed.data.upahKhusus) : null;

  const r = await prisma.rekapHarian.updateMany({
    where: { id, pembayaranId: null },
    data: { upahKhusus: jumlah, upahKhususCatatan: jumlah ? teksAtauNull(parsed.data.upahKhususCatatan, 255) : null },
  });
  if (r.count === 0) {
    const ada = await prisma.rekapHarian.findUnique({ where: { id }, select: { id: true } });
    if (!ada) return notFound("Baris tidak ditemukan.");
    return json({ message: "Baris ini sudah dibayar, jadi tidak bisa diubah lagi." }, { status: 409 });
  }
  return json({ ok: true });
});
