import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, notFound, route } from "@/lib/http";
import { putusPengajuanSchema } from "@/lib/services/absen-hp/skema";
import { bolehDiputus } from "@/lib/services/absen-hp/aturan";
import { setujuiPengajuanLuar, tolakPengajuanLuar } from "@/lib/services/absen-hp/simpan";

type Ctx = { params: Promise<{ id: string }> };

/** Setujui / tolak satu pengajuan absen di luar lokasi. Yang sudah diputus tidak bisa diputus ulang. */
export const PATCH = route<Ctx>(async (req, ctx) => {
  const session = await requireManager();
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return notFound("Pengajuan tidak ditemukan.");

  const parsed = putusPengajuanSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const b = await prisma.absenHpBukti.findUnique({ where: { id }, select: { status: true, attendanceId: true, alasan: true } });
  if (!b || b.alasan === null) return notFound("Pengajuan tidak ditemukan.");
  const boleh = bolehDiputus(b.status, b.attendanceId);
  if (!boleh.ok) return json({ message: boleh.alasan }, { status: 409 });

  const oleh = session.user?.email
    ? await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
    : null;
  const catatan = parsed.data.catatan || null;

  if (parsed.data.aksi === "setujui") {
    const r = await setujuiPengajuanLuar(id, oleh?.id ?? null, catatan);
    if (!r) return json({ message: "Pengajuan ini sudah diputuskan." }, { status: 409 });
    return json({ ok: true, status: "diterima", attendanceId: r.attendanceId });
  }
  const ok = await tolakPengajuanLuar(id, oleh?.id ?? null, catatan);
  if (!ok) return json({ message: "Pengajuan ini sudah diputuskan." }, { status: 409 });
  return json({ ok: true, status: "ditolak" });
});
