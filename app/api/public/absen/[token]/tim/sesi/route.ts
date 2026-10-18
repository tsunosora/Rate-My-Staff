import { prisma } from "@/lib/prisma";
import { badRequest, json, route } from "@/lib/http";
import { awalHari, bersihkanNamaTempat, periksaGps, sesiYangDipakaiUlang } from "@/lib/services/absen-tim/aturan";
import { mulaiSesiSchema } from "@/lib/services/absen-tim/skema";
import { wajibPic } from "@/lib/services/absen-tim/pic";

type Ctx = { params: Promise<{ token: string }> };

/**
 * PUBLIK (sesi PIN PIC) — mulai sesi absen tim di satu tempat kerja. Titik sesi = GPS HP PIC saat
 * ini (akurasi ≤ 150 m, sama dengan absen HP). Sesi hari ini milik PIC dengan nama tempat yang
 * sama DIBUKA LAGI, bukan dibuat dobel — titiknya tidak diubah.
 *
 * Bebas mode hanya-baca (lib/lisensi/aturan-jalur.ts): membuka sesi bagian dari mencatat
 * kehadiran, dan kehadiran tidak boleh hilang karena telat bayar.
 */
export const POST = route<Ctx>(async (req, ctx) => {
  const { token } = await ctx.params;
  const pic = await wajibPic(token, req, true);
  const parsed = mulaiSesiSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const d = parsed.data;

  const nama = bersihkanNamaTempat(d.namaTempat);
  if (!nama.ok) return json(nama, { status: 422 });

  const now = new Date();
  const hariIni = await prisma.sesiAbsenTim.findMany({
    where: { picId: pic.id, mulaiAt: { gte: awalHari(now) } },
    select: { id: true, namaTempat: true, mulaiAt: true },
  });
  const ada = sesiYangDipakaiUlang(hariIni, nama.nama, now);
  if (ada) return json({ ok: true, id: ada.id, namaTempat: ada.namaTempat, baru: false });

  const gps = periksaGps(d.lat, d.lng, d.akurasi);
  if (!gps.ok) return json(gps, { status: 422 });

  const s = await prisma.sesiAbsenTim.create({
    data: { picId: pic.id, namaTempat: nama.nama, lat: d.lat, lng: d.lng, akurasiM: Math.round(d.akurasi), mulaiAt: now },
    select: { id: true, namaTempat: true },
  });
  return json({ ok: true, id: s.id, namaTempat: s.namaTempat, baru: true }, { status: 201 });
});
