import { prisma } from "@/lib/prisma";
import { json, route } from "@/lib/http";
import { SLOT_DETIK, isiQr, slotSaatIni } from "@/lib/services/absen-hp/aturan";

type Ctx = { params: Promise<{ token: string }> };

/**
 * PUBLIK — isi QR yang sedang berlaku untuk layar satu lokasi (tablet/TV di toko).
 * `token` = layarToken lokasi (acak, beda dari rahasia QR-nya): yang memegang alamat layar bisa
 * MENAMPILKAN QR, tapi tidak bisa menghitung QR berikutnya — dan memang tidak perlu, karena QR
 * yang tampil di layar itu toh terlihat oleh siapa pun yang berdiri di depannya.
 */
export const GET = route<Ctx>(async (_req, ctx) => {
  const { token } = await ctx.params;
  const l = await prisma.absenLokasi.findUnique({
    where: { layarToken: token },
    select: { id: true, nama: true, qrRahasia: true, aktif: true, wajibQr: true },
  });
  if (!l || !l.aktif) return json({ message: "Layar ini tidak dikenali atau lokasinya sudah dinonaktifkan." }, { status: 404 });

  const now = Date.now();
  const sisa = SLOT_DETIK - Math.floor((now / 1000) % SLOT_DETIK);
  return json(
    { nama: l.nama, wajibQr: l.wajibQr, isi: isiQr(l, now), slot: slotSaatIni(now), sisaDetik: sisa, slotDetik: SLOT_DETIK },
    { headers: { "Cache-Control": "no-store" } },
  );
});
