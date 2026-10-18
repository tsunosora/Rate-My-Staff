import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, notFound, route } from "@/lib/http";
import { cariDuplikat, pesanGalat, rapikanNama, validasiTarifKotaDivisi } from "@/lib/services/upah-tarif/aturan";
import { angka, bentukTarif, tarifUbahSchema } from "@/lib/services/upah-tarif/skema";

type Ctx = { params: Promise<{ id: string }> };

/** Ubah sebagian tarif (termasuk aktif/nonaktif). */
export const PATCH = route<Ctx>(async (req, ctx) => {
  await requireManager();
  const id = Number((await ctx.params).id);
  const parsed = tarifUbahSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const lama = await prisma.tarifKotaDivisi.findUnique({ where: { id } });
  if (!lama) return notFound("Tarif tidak ditemukan.");

  const u = parsed.data;
  const baru = {
    kota: u.kota !== undefined ? rapikanNama(u.kota) : lama.kota,
    divisi: u.divisi !== undefined ? rapikanNama(u.divisi) : lama.divisi,
    upahHarian: u.upahHarian ?? angka(lama.upahHarian) ?? 0,
    lemburPerJam: u.lemburPerJam ?? angka(lama.lemburPerJam) ?? 0,
  };
  const galat = validasiTarifKotaDivisi(baru);
  if (galat.length) return json({ message: pesanGalat(galat) }, { status: 422 });

  if (u.kota !== undefined || u.divisi !== undefined) {
    const ada = await prisma.tarifKotaDivisi.findMany({ select: { id: true, kota: true, divisi: true } });
    const dobel = cariDuplikat(ada, baru.kota, baru.divisi, id);
    if (dobel) {
      return json({ message: `Tarif ${dobel.kota} · ${dobel.divisi} sudah ada.` }, { status: 409 });
    }
  }

  const t = await prisma.tarifKotaDivisi.update({
    where: { id },
    data: {
      kota: baru.kota,
      divisi: baru.divisi,
      upahHarian: baru.upahHarian,
      lemburPerJam: baru.lemburPerJam,
      ...(u.aktif !== undefined && { aktif: u.aktif }),
      ...(u.catatan !== undefined && { catatan: u.catatan?.trim() || null }),
    },
  });
  return json(bentukTarif(t));
});

/**
 * Hapus tarif. Aman: rekap harian tidak menyimpan rujukan ke tarif (tarif dicocokkan dari
 * kota & divisi saat upah dihitung), jadi yang hilang cuma tarif untuk hitungan BERIKUTNYA.
 * Upah yang sudah dibayar tercatat utuh di rincian pembayaran.
 */
export const DELETE = route<Ctx>(async (_req, ctx) => {
  await requireManager();
  const id = Number((await ctx.params).id);
  const lama = await prisma.tarifKotaDivisi.findUnique({ where: { id }, select: { id: true } });
  if (!lama) return notFound("Tarif tidak ditemukan.");
  await prisma.tarifKotaDivisi.delete({ where: { id } });
  return json({ ok: true });
});
