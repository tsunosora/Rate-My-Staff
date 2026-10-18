import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, notFound, route } from "@/lib/http";
import { transisi } from "@/lib/services/absen-tim/aturan";
import { putusBarisSchema } from "@/lib/services/absen-tim/skema";
import { idPengguna, setujuiBaris, tolakBaris } from "@/lib/services/absen-tim/simpan";

type Ctx = { params: Promise<{ id: string }> };

/** Setujui / tolak satu baris absen tim. Yang sudah diputus tidak bisa diputus ulang. */
export const PATCH = route<Ctx>(async (req, ctx) => {
  const session = await requireManager();
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return notFound("Absen tidak ditemukan.");
  const parsed = putusBarisSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const b = await prisma.absenTimBaris.findUnique({ where: { id }, select: { status: true, attendanceId: true } });
  if (!b) return notFound("Absen tidak ditemukan.");
  const t = transisi(b.status, b.attendanceId, parsed.data.aksi);
  if (!t.ok) return json({ message: t.alasan }, { status: 409 });

  const oleh = await idPengguna(session.user?.email);
  const catatan = parsed.data.catatan || null;
  if (parsed.data.aksi === "setujui") {
    const r = await setujuiBaris({ id }, oleh, catatan);
    if (r.disetujui === 0) return json({ message: "Absen ini sudah diputuskan." }, { status: 409 });
    return json({ ok: true, status: "diterima" });
  }
  if (!(await tolakBaris(id, oleh, catatan))) return json({ message: "Absen ini sudah diputuskan." }, { status: 409 });
  return json({ ok: true, status: "ditolak" });
});
