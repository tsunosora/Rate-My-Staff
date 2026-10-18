import { prisma } from "@/lib/prisma";
import { json, route } from "@/lib/http";
import { notifyManagers } from "@/lib/notify";
import { batasBeritahu, putuskanAbsenAnggota } from "@/lib/services/absen-tim/aturan";
import { FOTO_MAKS_BITA, simpanFotoTim } from "@/lib/services/absen-tim/simpan";
import { wajibPic } from "@/lib/services/absen-tim/pic";

type Ctx = { params: Promise<{ token: string }> };

const angka = (v: FormDataEntryValue | null) => (v === null || v === "" ? NaN : Number(v));

/**
 * PUBLIK (sesi PIN PIC) — PIC mencatat absen masuk/pulang SATU anggota. Multipart: sesi,
 * karyawan, jenis (in|out), foto, lat, lng, akurasi. Hasilnya baris MENUNGGU — Attendance baru
 * lahir saat owner/HR menyetujui (Absensi → Absen Tim).
 *
 * Urutan disengaja, sama dengan absen HP: keputusan (murah, tanpa menulis) DULU, baru foto
 * disimpan — absen yang ditolak tidak meninggalkan berkas di disk.
 * Bebas mode hanya-baca (lib/lisensi/aturan-jalur.ts): ini data kehadiran.
 */
export const POST = route<Ctx>(async (req, ctx) => {
  const { token } = await ctx.params;
  const pic = await wajibPic(token, req, true);

  const form = await req.formData().catch(() => null);
  if (!form) return json({ ok: false, alasan: "Kiriman tidak terbaca. Coba lagi." }, { status: 400 });

  const sesiId = Number(form.get("sesi"));
  const employeeId = Number(form.get("karyawan"));
  const jenis = String(form.get("jenis") ?? "");
  const lat = angka(form.get("lat"));
  const lng = angka(form.get("lng"));
  const akurasiM = angka(form.get("akurasi"));

  const sesi = Number.isInteger(sesiId) && sesiId > 0
    ? await prisma.sesiAbsenTim.findUnique({ where: { id: sesiId }, select: { id: true, picId: true, mulaiAt: true, lat: true, lng: true, namaTempat: true } })
    : null;
  if (!sesi) return json({ ok: false, kode: "sesi", alasan: "Sesi tidak ditemukan. Mulai sesi lagi." }, { status: 422 });

  const anggota = Number.isInteger(employeeId) && employeeId > 0
    ? await prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true, fullName: true, isActive: true, deletedAt: true } })
    : null;
  const terakhir = anggota
    ? await prisma.absenTimBaris.findFirst({
        where: { employeeId: anggota.id, jenis, status: { not: "ditolak" } },
        orderBy: { waktu: "desc" },
        select: { waktu: true },
      })
    : null;

  const k = putuskanAbsenAnggota({
    picId: pic.id,
    sesi,
    anggota,
    jenis,
    terakhirSamaJenis: terakhir?.waktu ?? null,
    lat,
    lng,
    akurasiM,
    nowMs: Date.now(),
  });
  if (!k.ok) return json(k, { status: 422 });

  const foto = form.get("foto");
  if (!(foto instanceof File) || foto.size === 0) {
    return json({ ok: false, kode: "tanpa_foto", alasan: "Ambil foto wajahnya dulu." }, { status: 422 });
  }
  if (foto.size > FOTO_MAKS_BITA) {
    return json({ ok: false, kode: "foto_besar", alasan: "Foto terlalu besar. Coba ambil ulang." }, { status: 422 });
  }
  let fotoPath: string;
  try {
    fotoPath = await simpanFotoTim(new Uint8Array(await foto.arrayBuffer()));
  } catch {
    return json({ ok: false, kode: "bukan_gambar", alasan: "Berkas foto tidak dikenali. Ambil ulang fotonya." }, { status: 422 });
  }

  const b = await prisma.absenTimBaris.create({
    data: { sesiId: sesi.id, employeeId: anggota!.id, jenis: k.jenis, lat, lng, akurasiM: Math.round(akurasiM), fotoPath },
    select: { id: true, waktu: true },
  });

  // Paling banyak satu notifikasi per sesi per 30 menit: updateMany bersyarat menjadikan "siapa
  // yang memberi tahu" atomik, jadi 20 absen beruntun (atau serentak) cuma satu notifikasi.
  const now = Date.now();
  const giliran = await prisma.sesiAbsenTim.updateMany({
    where: { id: sesi.id, OR: [{ diberitahuAt: null }, { diberitahuAt: { lte: batasBeritahu(now) } }] },
    data: { diberitahuAt: new Date(now) },
  });
  if (giliran.count > 0) {
    const menunggu = await prisma.absenTimBaris.count({ where: { sesiId: sesi.id, status: "menunggu" } });
    await notifyManagers("absen_tim", {
      title: "Absen tim menunggu persetujuan",
      message: `${pic.fullName} · ${sesi.namaTempat} · ${menunggu} absen menunggu`,
      sesiId: sesi.id,
      href: "/attendance/absen-tim",
    });
  }

  return json({ ok: true, id: b.id, jam: b.waktu, jenis: k.jenis, nama: anggota!.fullName, jarakM: k.jarakM, menunggu: true });
});
