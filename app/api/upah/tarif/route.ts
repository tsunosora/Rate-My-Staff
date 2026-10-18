import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, route } from "@/lib/http";
import { cariDuplikat, pesanGalat, rapikanNama, validasiTarifKotaDivisi } from "@/lib/services/upah-tarif/aturan";
import { bentukTarif, tarifBaruSchema } from "@/lib/services/upah-tarif/skema";

/** Semua tarif kota × divisi (aktif & nonaktif). `?aktif=1` → yang aktif saja. */
export const GET = route(async (req: Request) => {
  await requireManager();
  const hanyaAktif = new URL(req.url).searchParams.get("aktif") === "1";
  const daftar = await prisma.tarifKotaDivisi.findMany({
    where: hanyaAktif ? { aktif: true } : undefined,
    orderBy: [{ kota: "asc" }, { divisi: "asc" }],
  });
  return json(daftar.map(bentukTarif));
});

export const POST = route(async (req: Request) => {
  await requireManager();
  const parsed = tarifBaruSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const d = { ...parsed.data, kota: rapikanNama(parsed.data.kota), divisi: rapikanNama(parsed.data.divisi) };

  const galat = validasiTarifKotaDivisi(d);
  if (galat.length) return json({ message: pesanGalat(galat) }, { status: 422 });

  const ada = await prisma.tarifKotaDivisi.findMany({ select: { id: true, kota: true, divisi: true } });
  const dobel = cariDuplikat(ada, d.kota, d.divisi);
  if (dobel) {
    return json({ message: `Tarif ${dobel.kota} · ${dobel.divisi} sudah ada. Ubah baris itu saja.` }, { status: 409 });
  }

  const t = await prisma.tarifKotaDivisi.create({
    data: {
      kota: d.kota,
      divisi: d.divisi,
      upahHarian: d.upahHarian,
      lemburPerJam: d.lemburPerJam,
      aktif: d.aktif,
      catatan: d.catatan?.trim() || null,
    },
  });
  return json(bentukTarif(t), { status: 201 });
});
