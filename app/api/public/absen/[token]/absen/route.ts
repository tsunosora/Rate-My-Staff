import { prisma } from "@/lib/prisma";
import { json, route } from "@/lib/http";
import { requirePortalOwner } from "@/lib/services/portal/auth";
import { putuskanAbsen } from "@/lib/services/absen-hp/aturan";
import { FOTO_MAKS_BITA, catatAbsenHp, lokasiAktif, simpanFoto } from "@/lib/services/absen-hp/simpan";
import { kontakDari } from "@/lib/services/fingerspot/kontak-mesin";

type Ctx = { params: Promise<{ token: string }> };

const angka = (v: FormDataEntryValue | null) => (v === null || v === "" ? NaN : Number(v));

/**
 * PUBLIK (sesi PIN karyawan) — absen dari HP. Multipart: foto, lat, lng, akurasi, perangkat, qr.
 *
 * Owner yang membuka halaman karyawan lewat ?owner=1 DITOLAK di sini (requirePortalOwner):
 * owner boleh melihat, tidak boleh absen atas nama karyawannya.
 *
 * Urutan disengaja: keputusan (murah, tanpa menulis) DULU, baru foto disimpan — absen yang
 * ditolak tidak meninggalkan berkas foto di disk.
 */
export const POST = route<Ctx>(async (req, ctx) => {
  const { token } = await ctx.params;
  const employee = await requirePortalOwner(token, req);

  const form = await req.formData().catch(() => null);
  if (!form) return json({ ok: false, alasan: "Kiriman tidak terbaca. Coba lagi." }, { status: 400 });

  const lat = angka(form.get("lat"));
  const lng = angka(form.get("lng"));
  const akurasiM = angka(form.get("akurasi"));
  const terakhir = await prisma.absenHpBukti.findFirst({
    where: { employeeId: employee.id },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  const keputusan = putuskanAbsen({
    aktif: employee.absenHp,
    perangkatTerdaftar: employee.absenHpPerangkat,
    idPerangkat: String(form.get("perangkat") ?? ""),
    lokasi: await lokasiAktif(),
    lat,
    lng,
    akurasiM,
    qr: (form.get("qr") as string | null) || null,
    absenTerakhir: terakhir?.createdAt ?? null,
    nowMs: Date.now(),
  });
  if (!keputusan.ok) return json(keputusan, { status: 422 });

  const foto = form.get("foto");
  if (!(foto instanceof File) || foto.size === 0) {
    return json({ ok: false, kode: "tanpa_foto", alasan: "Ambil foto wajah dulu." }, { status: 422 });
  }
  if (foto.size > FOTO_MAKS_BITA) {
    return json({ ok: false, kode: "foto_besar", alasan: "Foto terlalu besar. Coba ambil ulang." }, { status: 422 });
  }

  let fotoPath: string;
  try {
    fotoPath = await simpanFoto(new Uint8Array(await foto.arrayBuffer()));
  } catch {
    return json({ ok: false, kode: "bukan_gambar", alasan: "Berkas foto tidak dikenali. Ambil ulang fotonya." }, { status: 422 });
  }

  const hasil = await catatAbsenHp({
    employeeId: employee.id,
    keputusan,
    lat,
    lng,
    akurasiM,
    fotoPath,
    ip: kontakDari(req.headers).ip,
  });

  return json({
    ok: true,
    jenis: hasil.scanType,
    jam: hasil.waktu,
    lokasi: keputusan.lokasi.nama,
    jarakM: keputusan.jarakM,
    qr: keputusan.qr,
    hpBaruDikunci: keputusan.kunciPerangkat,
  });
});
