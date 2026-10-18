import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, notFound, route } from "@/lib/http";
import { setujuiSesiSchema } from "@/lib/services/absen-tim/skema";
import { idPengguna, setujuiBaris } from "@/lib/services/absen-tim/simpan";

type Ctx = { params: Promise<{ id: string }> };

/**
 * "Setujui semua yang menunggu" di satu sesi — satu klik untuk 20 tukang. Baris yang sudah
 * diputus (termasuk yang ditolak) tidak disentuh. Dua klik serentak aman (lihat setujuiBaris).
 */
export const POST = route<Ctx>(async (req, ctx) => {
  const session = await requireManager();
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return notFound("Sesi tidak ditemukan.");
  const parsed = setujuiSesiSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const ada = await prisma.sesiAbsenTim.findUnique({ where: { id }, select: { id: true } });
  if (!ada) return notFound("Sesi tidak ditemukan.");

  const r = await setujuiBaris({ sesiId: id }, await idPengguna(session.user?.email), parsed.data.catatan || null);
  return json({ ok: true, disetujui: r.disetujui });
});
