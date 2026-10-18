import { prisma } from "@/lib/prisma";
import { json, route } from "@/lib/http";
import { requirePortalAccess, requirePortalOwner } from "@/lib/services/portal/auth";
import { kontakDari } from "@/lib/services/fingerspot/kontak-mesin";
import { mulaiKunjunganSchema } from "@/lib/validators/kunjungan";
import {
  durasiMenit,
  jarakMasukKeluar,
  putuskanMulai,
  saranNamaKlien,
  statusKunjungan,
} from "@/lib/services/kunjungan/aturan";
import { FOTO_MAKS_BITA, hapusFoto, simpanFoto } from "@/lib/services/kunjungan/simpan";

type Ctx = { params: Promise<{ token: string }> };

const PILIH = {
  id: true,
  namaKlien: true,
  alamat: true,
  tujuan: true,
  masukAt: true,
  keluarAt: true,
  masukLat: true,
  masukLng: true,
  keluarLat: true,
  keluarLng: true,
  hasil: true,
  catatan: true,
} as const;

type Baris = {
  id: number;
  namaKlien: string;
  alamat: string | null;
  tujuan: string | null;
  masukAt: Date;
  keluarAt: Date | null;
  masukLat: number;
  masukLng: number;
  keluarLat: number | null;
  keluarLng: number | null;
  hasil: string | null;
  catatan: string | null;
};

/** Koordinat sengaja tidak dikirim ke HP — karyawan cuma perlu durasi & jaraknya. */
function bentuk(k: Baris, nowMs: number) {
  return {
    id: k.id,
    namaKlien: k.namaKlien,
    alamat: k.alamat,
    tujuan: k.tujuan,
    masukAt: k.masukAt.toISOString(),
    keluarAt: k.keluarAt?.toISOString() ?? null,
    durasiMenit: durasiMenit(k.masukAt, k.keluarAt),
    jarakM: jarakMasukKeluar(k),
    hasil: k.hasil,
    catatan: k.catatan,
    status: statusKunjungan(k, nowMs),
  };
}

/** PORTAL (butuh PIN) — kunjungan yang sedang berjalan, riwayat bulan ini, dan saran nama klien. */
export const GET = route<Ctx>(async (req, ctx) => {
  const { token } = await ctx.params;
  const { employee, asManager } = await requirePortalAccess(token, req);
  const now = Date.now();
  const awalBulan = new Date();
  awalBulan.setDate(1);
  awalBulan.setHours(0, 0, 0, 0);

  const [bulanIni, terbuka, nama] = await Promise.all([
    prisma.kunjunganKlien.findMany({
      where: { employeeId: employee.id, masukAt: { gte: awalBulan } },
      orderBy: [{ masukAt: "desc" }, { id: "desc" }],
      take: 300,
      select: PILIH,
    }),
    prisma.kunjunganKlien.findFirst({
      where: { employeeId: employee.id, keluarAt: null },
      orderBy: { masukAt: "desc" },
      select: PILIH,
    }),
    prisma.kunjunganKlien.findMany({
      where: { employeeId: employee.id },
      orderBy: { masukAt: "desc" },
      take: 300,
      select: { namaKlien: true },
    }),
  ]);

  return json({
    sebagaiOwner: asManager,
    terbuka: terbuka && statusKunjungan(terbuka, now) === "berjalan" ? bentuk(terbuka, now) : null,
    items: bulanIni.map((k) => bentuk(k, now)),
    saran: saranNamaKlien(nama.map((n) => n.namaKlien)),
  });
});

/**
 * PORTAL (sesi PIN karyawan) — mulai kunjungan. Multipart: namaKlien, alamat, tujuan, lat, lng,
 * akurasi, foto (opsional). Owner yang membuka lewat ?owner=1 ditolak (requirePortalOwner).
 *
 * Urutan disengaja: keputusan dulu (murah, tanpa menulis), baru foto disimpan — kunjungan yang
 * ditolak tidak meninggalkan berkas foto di disk.
 */
export const POST = route<Ctx>(async (req, ctx) => {
  const { token } = await ctx.params;
  const employee = await requirePortalOwner(token, req);

  const form = await req.formData().catch(() => null);
  if (!form) return json({ ok: false, kode: "kiriman", alasan: "Kiriman tidak terbaca. Coba lagi." }, { status: 400 });

  const p = mulaiKunjunganSchema.safeParse({
    namaKlien: form.get("namaKlien") ?? "",
    alamat: form.get("alamat"),
    tujuan: form.get("tujuan"),
    lat: form.get("lat"),
    lng: form.get("lng"),
    akurasi: form.get("akurasi"),
  });
  if (!p.success) {
    return json({ ok: false, kode: "isian", alasan: p.error.issues[0]?.message ?? "Isian belum lengkap." }, { status: 422 });
  }

  const now = Date.now();
  const terbuka = await prisma.kunjunganKlien.findFirst({
    where: { employeeId: employee.id, keluarAt: null },
    orderBy: { masukAt: "desc" },
    select: { id: true, namaKlien: true, masukAt: true, keluarAt: true },
  });
  const keputusan = putuskanMulai({
    namaKlien: p.data.namaKlien,
    titik: { lat: p.data.lat, lng: p.data.lng, akurasiM: p.data.akurasi },
    terbuka,
    nowMs: now,
  });
  if (!keputusan.ok) return json(keputusan, { status: keputusan.kode === "masih_terbuka" ? 409 : 422 });

  let fotoPath: string | null = null;
  const foto = form.get("foto");
  if (foto instanceof File && foto.size > 0) {
    if (foto.size > FOTO_MAKS_BITA) {
      return json({ ok: false, kode: "foto_besar", alasan: "Foto terlalu besar (maks. 6 MB). Coba ambil ulang." }, { status: 422 });
    }
    try {
      fotoPath = await simpanFoto(new Uint8Array(await foto.arrayBuffer()));
    } catch {
      return json({ ok: false, kode: "bukan_gambar", alasan: "Berkas foto tidak dikenali. Ambil ulang fotonya." }, { status: 422 });
    }
  }

  try {
    const baru = await prisma.kunjunganKlien.create({
      data: {
        employeeId: employee.id,
        namaKlien: keputusan.namaKlien,
        alamat: p.data.alamat,
        tujuan: p.data.tujuan,
        masukAt: new Date(now),
        masukLat: p.data.lat,
        masukLng: p.data.lng,
        masukAkurasiM: Math.round(p.data.akurasi),
        masukFoto: fotoPath,
        ip: kontakDari(req.headers).ip,
      },
      select: PILIH,
    });
    return json({ ok: true, kunjungan: bentuk(baru, now) }, { status: 201 });
  } catch (e) {
    if (fotoPath) await hapusFoto(fotoPath);
    throw e;
  }
});
