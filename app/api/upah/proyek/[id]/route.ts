import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, notFound, route } from "@/lib/http";
import { atMidnight } from "@/lib/services/leave/service";
import { bolehHapusProyek, pesanGalat, rapikanNama, validasiProyek } from "@/lib/services/upah-tarif/aturan";
import { angka, bentukProyek, proyekUbahSchema } from "@/lib/services/upah-tarif/skema";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Ubah sebagian proyek (termasuk aktif/nonaktif). Tarif proyek yang diubah berlaku untuk upah
 * yang BELUM dibayar — yang sudah dibayar tercatat utuh di rincian pembayarannya.
 */
export const PATCH = route<Ctx>(async (req, ctx) => {
  await requireManager();
  const id = Number((await ctx.params).id);
  const parsed = proyekUbahSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const lama = await prisma.proyekKerja.findUnique({ where: { id } });
  if (!lama) return notFound("Proyek tidak ditemukan.");

  const u = parsed.data;
  const mulai = u.mulai !== undefined ? (u.mulai ? atMidnight(u.mulai) : null) : lama.mulai;
  const selesai = u.selesai !== undefined ? (u.selesai ? atMidnight(u.selesai) : null) : lama.selesai;
  const galat = validasiProyek({
    nama: u.nama ?? lama.nama,
    mulai,
    selesai,
    upahHarian: u.upahHarian !== undefined ? u.upahHarian : angka(lama.upahHarian),
    lemburPerJam: u.lemburPerJam !== undefined ? u.lemburPerJam : angka(lama.lemburPerJam),
  });
  if (galat.length) return json({ message: pesanGalat(galat) }, { status: 422 });

  const p = await prisma.proyekKerja.update({
    where: { id },
    data: {
      ...(u.kode !== undefined && { kode: rapikanNama(u.kode) || null }),
      ...(u.nama !== undefined && { nama: rapikanNama(u.nama) }),
      ...(u.lokasi !== undefined && { lokasi: rapikanNama(u.lokasi) || null }),
      ...(u.mulai !== undefined && { mulai }),
      ...(u.selesai !== undefined && { selesai }),
      ...(u.upahHarian !== undefined && { upahHarian: u.upahHarian }),
      ...(u.lemburPerJam !== undefined && { lemburPerJam: u.lemburPerJam }),
      ...(u.aktif !== undefined && { aktif: u.aktif }),
    },
    include: { _count: { select: { rekap: true } } },
  });
  return json(bentukProyek(p));
});

/** Hapus hanya kalau belum dipakai catatan harian; selain itu jawab 409 + sarankan nonaktifkan. */
export const DELETE = route<Ctx>(async (_req, ctx) => {
  await requireManager();
  const id = Number((await ctx.params).id);
  const p = await prisma.proyekKerja.findUnique({ where: { id }, include: { _count: { select: { rekap: true } } } });
  if (!p) return notFound("Proyek tidak ditemukan.");
  const putusan = bolehHapusProyek(p._count.rekap);
  if (!putusan.boleh) return json({ message: putusan.pesan }, { status: 409 });
  await prisma.proyekKerja.delete({ where: { id } });
  return json({ ok: true });
});
