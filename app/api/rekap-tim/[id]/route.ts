import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, notFound, route } from "@/lib/http";
import { alasanTolakSah, bolehPutus, teksAtauNull, terkunci } from "@/lib/services/upah/aturan";
import { idPengguna } from "@/lib/services/upah/rekap";
import { putusRekapSchema } from "@/lib/services/upah/skema";

type Ctx = { params: Promise<{ id: string }> };

const BERUBAH = "Baris ini baru saja diubah atau sudah diputus orang lain. Muat ulang lalu coba lagi.";

/**
 * Satu baris rekap: `setujui`, `tolak` (alasan wajib), atau `ubah` (status, lembur, kota, divisi,
 * proyek, catatan). Admin yang mengubah sekaligus menyetujui; `sumber` tidak berubah.
 * `versi` = updatedAt saat dimuat. Penguncian lewat updateMany bersyarat (id + versi + belum
 * dibayar): klik ganda, atau PIC yang mengubah baris di saat yang sama, tidak pernah tertimpa diam-diam.
 */
export const PATCH = route<Ctx>(async (req, ctx) => {
  const session = await requireManager();
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return notFound("Baris tidak ditemukan.");
  const parsed = putusRekapSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const d = parsed.data;

  const b = await prisma.rekapHarian.findUnique({ where: { id }, select: { persetujuan: true, pembayaranId: true, updatedAt: true } });
  if (!b) return notFound("Baris tidak ditemukan.");
  if (terkunci(b)) return json({ message: "Baris ini sudah dibayar, jadi tidak bisa diubah lagi." }, { status: 409 });
  const versi = new Date(d.versi);
  if (Number.isNaN(versi.getTime()) || versi.getTime() !== b.updatedAt.getTime()) return json({ message: BERUBAH }, { status: 409 });

  const oleh = await idPengguna(session.user?.email);
  const kunci = { id, updatedAt: b.updatedAt, pembayaranId: null };
  let data: Parameters<typeof prisma.rekapHarian.updateMany>[0]["data"];

  if (d.aksi === "ubah") {
    if (d.proyekId && !(await prisma.proyekKerja.findUnique({ where: { id: d.proyekId }, select: { id: true } }))) {
      return badRequest({ formErrors: ["Proyek tidak ditemukan."] });
    }
    data = {
      status: d.status,
      lemburJam: d.lemburJam,
      kota: teksAtauNull(d.kota, 100),
      divisi: teksAtauNull(d.divisi, 100),
      proyekId: d.proyekId ?? null,
      catatan: teksAtauNull(d.catatan, 255),
      persetujuan: "disetujui",
      decidedById: oleh,
      decidedAt: new Date(),
      alasanTolak: null,
    };
  } else {
    const boleh = bolehPutus(b, d.aksi);
    if (!boleh.ok) return json({ message: boleh.pesan }, { status: 409 });
    if (d.aksi === "tolak") {
      const alasan = alasanTolakSah(d.alasan);
      if (!alasan) return badRequest({ alasan: ["Tulis alasan penolakan (minimal 3 huruf)."] });
      data = { persetujuan: "ditolak", alasanTolak: alasan, decidedById: oleh, decidedAt: new Date() };
    } else {
      data = { persetujuan: "disetujui", alasanTolak: null, decidedById: oleh, decidedAt: new Date() };
    }
  }

  const r = await prisma.rekapHarian.updateMany({ where: kunci, data });
  if (r.count === 0) return json({ message: BERUBAH }, { status: 409 });
  return json({ ok: true });
});
