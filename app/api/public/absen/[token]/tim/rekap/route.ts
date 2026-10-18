import { prisma } from "@/lib/prisma";
import { json, route } from "@/lib/http";
import { wajibPic } from "@/lib/services/absen-tim/pic";
import { bersihkanKiriman, periksaTanggal, ymd } from "@/lib/services/rekap-tim/aturan";
import { FOTO_REKAP_MAKS_BITA } from "@/lib/services/rekap-tim/foto";
import { konteksRekap, simpanRekap } from "@/lib/services/rekap-tim/service";
import { timUntukPic } from "@/lib/services/tim-kerja/service";

type Ctx = { params: Promise<{ token: string }> };

/**
 * PUBLIK (sesi PIN PIC) — keadaan layar "Rekap tim" untuk satu tanggal (`?tanggal=YYYY-MM-DD`,
 * bawaannya hari ini): tim PIC beserta anggotanya, isi yang sudah tersimpan (status persetujuan,
 * dibayar/terkunci), dan pilihan kota, divisi, proyek.
 *
 * PIC yang belum punya tim DIBUATKAN "Tim <nama PIC>" di sini (timUntukPic) — membuka layar ini
 * pertama kali sudah cukup untuk mulai.
 */
export const GET = route<Ctx>(async (req, ctx) => {
  const { token } = await ctx.params;
  const pic = await wajibPic(token, req);
  const tgl = periksaTanggal(new URL(req.url).searchParams.get("tanggal") ?? ymd(new Date()), new Date());
  if (!tgl.ok) return json(tgl, { status: 422 });
  const tim = await timUntukPic(prisma, pic.id);
  return json(await konteksRekap(prisma, pic, tim, tgl.tanggal));
});

const angka = (v: unknown) => (v === null || v === undefined || v === "" ? NaN : Number(v));

/**
 * PUBLIK (sesi PIN PIC) — simpan rekap satu tanggal. SATU kiriman multipart:
 * - `data`: JSON `{ tanggal, baris: [{ employeeId, status, lemburJam, kota, divisi, proyekId }],
 *    lokasi?: { lat, lng, akurasi } }` — hanya orang yang sudah diisi;
 * - `foto-<employeeId>`: foto opsional per orang (sudah dikecilkan di HP).
 * Satu kiriman, bukan foto terpisah: rekap & fotonya tersimpan bersama atau tidak sama sekali,
 * dan HP tidak perlu mengurus antrean unggah sendiri.
 *
 * Bebas mode hanya-baca (lib/lisensi/aturan-jalur.ts): ini data kehadiran.
 */
export const POST = route<Ctx>(async (req, ctx) => {
  const { token } = await ctx.params;
  const pic = await wajibPic(token, req, true);

  const form = await req.formData().catch(() => null);
  let data: { tanggal?: unknown; baris?: unknown; lokasi?: { lat?: unknown; lng?: unknown; akurasi?: unknown } | null } | null = null;
  try {
    data = form ? JSON.parse(String(form.get("data") ?? "")) : null;
  } catch {
    data = null;
  }
  if (!form || !data) return json({ ok: false, kode: "kiriman", alasan: "Kiriman tidak terbaca. Coba lagi." }, { status: 400 });

  const tgl = periksaTanggal(String(data.tanggal ?? ""), new Date());
  if (!tgl.ok) return json(tgl, { status: 422 });
  const kiriman = bersihkanKiriman(data.baris);
  if (!kiriman.ok) return json(kiriman, { status: 422 });

  const foto = new Map<number, Uint8Array>();
  for (const b of kiriman.baris) {
    const f = form.get(`foto-${b.employeeId}`);
    if (!(f instanceof File) || f.size === 0) continue;
    if (f.size > FOTO_REKAP_MAKS_BITA) {
      return json({ ok: false, kode: "foto_besar", alasan: "Ada foto yang terlalu besar. Ambil ulang fotonya." }, { status: 422 });
    }
    foto.set(b.employeeId, new Uint8Array(await f.arrayBuffer()));
  }

  // Lokasi HP PIC opsional: kalau ditolak/kabur, rekap tetap tersimpan tanpa lokasi.
  const l = data.lokasi;
  const lat = angka(l?.lat), lng = angka(l?.lng), akurasi = angka(l?.akurasi);
  const lokasi = [lat, lng, akurasi].every(Number.isFinite) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && akurasi >= 0
    ? { lat, lng, akurasiM: akurasi }
    : null;

  const tim = await timUntukPic(prisma, pic.id);
  const hasil = await simpanRekap(prisma, { pic, tim, tanggal: tgl.tanggal, baris: kiriman.baris, foto, lokasi });
  if (!hasil.ok) return json(hasil, { status: 422 });
  return json(hasil);
});
