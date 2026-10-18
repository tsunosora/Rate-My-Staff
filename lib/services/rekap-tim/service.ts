import type { PrismaClient } from "@prisma/client";
import { notifyManagers } from "@/lib/notify";
import { anggotaTim, type TimRingkas } from "@/lib/services/tim-kerja/service";
import {
  JEDA_NOTIF_MENIT, bolehBeritahu, bukanAnggota, isiAwal, pilihanUnik, putuskanBaris, rentangTanggal, ymd,
  type IsiRekap, type KirimanBaris, type StatusRekap, type Tolak,
} from "./aturan";
import { simpanFotoRekap } from "./foto";

/**
 * Rekap harian tim oleh PIC — baca keadaan layar HP dan simpan kiriman. Keputusan per baris di
 * ./aturan (murni, teruji); di sini cuma basis data, foto, dan notifikasi.
 */

const angka = (d: { toNumber(): number } | number | null | undefined) => (d === null || d === undefined ? 0 : typeof d === "number" ? d : d.toNumber());

const pilihBaris = {
  id: true, employeeId: true, status: true, lemburJam: true, kota: true, divisi: true, proyekId: true,
  persetujuan: true, alasanTolak: true, pembayaranId: true, fotoPath: true, dicatatOlehPicId: true,
  dicatatPic: { select: { fullName: true } },
} as const;

const isiDari = (b: { status: string; lemburJam: { toNumber(): number } | number; kota: string | null; divisi: string | null; proyekId: number | null }): IsiRekap => ({
  status: b.status as StatusRekap,
  lemburJam: angka(b.lemburJam),
  kota: b.kota,
  divisi: b.divisi,
  proyekId: b.proyekId,
});

/** Keadaan layar rekap di HP PIC untuk satu tanggal. */
export async function konteksRekap(prisma: PrismaClient, pic: { id: number; fullName: string }, tim: TimRingkas, tanggal: Date) {
  const anggota = await anggotaTim(prisma, tim);
  const ids = anggota.map((a) => a.id);
  const [baris, tarif, proyek] = await Promise.all([
    ids.length ? prisma.rekapHarian.findMany({ where: { employeeId: { in: ids }, tanggal }, select: pilihBaris }) : [],
    prisma.tarifKotaDivisi.findMany({ where: { aktif: true }, select: { kota: true, divisi: true } }),
    prisma.proyekKerja.findMany({ where: { aktif: true }, orderBy: [{ mulai: "desc" }, { nama: "asc" }], select: { id: true, kode: true, nama: true, lokasi: true } }),
  ]);
  const perOrang = new Map(baris.map((b) => [b.employeeId, b]));

  // Proyek yang sudah tersimpan di baris tapi kini nonaktif tetap ikut daftar, supaya pilihannya
  // tidak tampil kosong (dan PIC tidak mengira datanya hilang).
  const idProyek = new Set(proyek.map((p) => p.id));
  const proyekLama = baris.map((b) => b.proyekId).filter((id): id is number => id !== null && !idProyek.has(id));
  const tambahanProyek = proyekLama.length
    ? await prisma.proyekKerja.findMany({ where: { id: { in: [...new Set(proyekLama)] } }, select: { id: true, kode: true, nama: true, lokasi: true } })
    : [];

  return {
    pic: { id: pic.id, nama: pic.fullName },
    tim: { id: tim.id, nama: tim.nama, kepala: tim.picNama, saya: tim.picId === pic.id },
    tanggal: ymd(tanggal),
    rentang: rentangTanggal(new Date()),
    pilihan: {
      kota: pilihanUnik(tarif.map((t) => t.kota), anggota.map((a) => a.kotaBawaan), baris.map((b) => b.kota)),
      divisi: pilihanUnik(tarif.map((t) => t.divisi), anggota.map((a) => a.divisiBawaan), baris.map((b) => b.divisi)),
      proyek: [...proyek, ...tambahanProyek.map((p) => ({ ...p, nonaktif: true }))],
    },
    anggota: anggota.map((a) => {
      const b = perOrang.get(a.id) ?? null;
      return {
        id: a.id,
        nama: a.fullName,
        panggilan: a.nickname,
        jabatan: a.position?.name ?? null,
        kepala: a.id === tim.picId,
        freelance: a.jenis === "freelance",
        freelanceBaru: a.jenis === "freelance" && a.perluDiperiksa,
        isi: isiAwal(b && isiDari(b), a),
        tersimpan: b
          ? {
              persetujuan: b.persetujuan,
              alasanTolak: b.alasanTolak,
              dibayar: b.pembayaranId !== null,
              adaFoto: Boolean(b.fotoPath),
              dicatatOleh: b.dicatatPic?.fullName ?? null,
              dicatatOrangLain: b.dicatatOlehPicId !== null && b.dicatatOlehPicId !== pic.id,
            }
          : null,
      };
    }),
  };
}

export type HasilSimpan = {
  ok: true;
  baru: number;
  diubah: number;
  tetap: number;
  /** Nama orang yang barisnya sudah dibayar — dilewati, tidak diubah. */
  terkunci: string[];
};

/**
 * Simpan kiriman HP untuk satu tim + tanggal. Urutan disengaja:
 * 1. semua orang wajib anggota tim PIC ini (ditolak SELURUHNYA kalau ada satu saja yang bukan);
 * 2. proyek wajib ada & aktif (atau memang sudah tersimpan di baris itu);
 * 3. keputusan per baris (buat / ubah → menunggu / tetap / terkunci);
 * 4. foto disimpan SESUDAH keputusan — kiriman yang ditolak tidak meninggalkan berkas di disk;
 * 5. tulis dalam satu transaksi. Ubah bersyarat `pembayaranId: null`, jadi baris yang dibayar
 *    di sela pembacaan & penulisan tetap tidak tersentuh.
 */
export async function simpanRekap(
  prisma: PrismaClient,
  m: {
    pic: { id: number; fullName: string };
    tim: TimRingkas;
    tanggal: Date;
    baris: KirimanBaris[];
    foto: Map<number, Uint8Array>;
    lokasi: { lat: number; lng: number; akurasiM: number } | null;
  },
): Promise<HasilSimpan | Tolak> {
  const ids = m.baris.map((b) => b.employeeId);
  const karyawan = await prisma.employee.findMany({
    where: { id: { in: ids } },
    select: { id: true, fullName: true, timId: true, isActive: true, deletedAt: true },
  });
  const ditolak = bukanAnggota(m.tim.id, ids, karyawan);
  if (ditolak.length) {
    return {
      ok: false,
      kode: "bukan_anggota",
      alasan: `${ditolak.length} orang bukan anggota ${m.tim.nama} lagi. Muat ulang lalu simpan lagi.`,
    };
  }
  const namaDari = new Map(karyawan.map((k) => [k.id, k.fullName]));

  const lama = await prisma.rekapHarian.findMany({
    where: { employeeId: { in: ids }, tanggal: m.tanggal },
    select: { id: true, employeeId: true, status: true, lemburJam: true, kota: true, divisi: true, proyekId: true, persetujuan: true, pembayaranId: true },
  });
  const lamaDari = new Map(lama.map((b) => [b.employeeId, b]));

  const idProyek = [...new Set(m.baris.map((b) => b.proyekId).filter((p): p is number => p !== null))];
  const proyek = idProyek.length ? await prisma.proyekKerja.findMany({ where: { id: { in: idProyek } }, select: { id: true, aktif: true } }) : [];
  const aktifProyek = new Map(proyek.map((p) => [p.id, p.aktif]));
  for (const b of m.baris) {
    if (b.proyekId === null) continue;
    const aktif = aktifProyek.get(b.proyekId);
    const samaDenganLama = lamaDari.get(b.employeeId)?.proyekId === b.proyekId;
    if (aktif === undefined || (!aktif && !samaDenganLama)) {
      return { ok: false, kode: "proyek", alasan: "Ada proyek yang sudah tidak aktif. Muat ulang lalu pilih proyek lagi." };
    }
  }

  const rencana = m.baris.map((b) => {
    const l = lamaDari.get(b.employeeId) ?? null;
    const aksi = putuskanBaris(l && { ...isiDari(l), id: l.id, persetujuan: l.persetujuan, pembayaranId: l.pembayaranId }, b);
    return { b, l, aksi };
  });

  // Foto: hanya untuk baris yang memang akan ditulis (bukan yang terkunci).
  const fotoPath = new Map<number, string>();
  for (const r of rencana) {
    const f = m.foto.get(r.b.employeeId);
    if (!f || r.aksi === "terkunci") continue;
    try {
      fotoPath.set(r.b.employeeId, await simpanFotoRekap(f));
    } catch {
      return { ok: false, kode: "bukan_gambar", alasan: `Foto ${namaDari.get(r.b.employeeId) ?? ""} tidak dikenali. Ambil ulang fotonya.` };
    }
  }

  const lokasi = m.lokasi ? { lat: m.lokasi.lat, lng: m.lokasi.lng, akurasiM: Math.round(m.lokasi.akurasiM) } : {};
  const hasil: HasilSimpan = { ok: true, baru: 0, diubah: 0, tetap: 0, terkunci: [] };

  await prisma.$transaction(async (tx) => {
    for (const { b, l, aksi } of rencana) {
      const foto = fotoPath.get(b.employeeId);
      const isi = { status: b.status, lemburJam: b.lemburJam, kota: b.kota, divisi: b.divisi, proyekId: b.proyekId };
      if (aksi === "terkunci") {
        hasil.terkunci.push(namaDari.get(b.employeeId) ?? `#${b.employeeId}`);
      } else if (aksi === "buat") {
        await tx.rekapHarian.create({
          data: {
            employeeId: b.employeeId, tanggal: m.tanggal, ...isi, ...lokasi,
            fotoPath: foto ?? null, dicatatOlehPicId: m.pic.id, sumber: "pic", persetujuan: "menunggu",
          },
        });
        hasil.baru++;
      } else if (aksi === "ubah") {
        const r = await tx.rekapHarian.updateMany({
          where: { id: l!.id, pembayaranId: null },
          data: {
            ...isi, ...lokasi, ...(foto ? { fotoPath: foto } : {}),
            dicatatOlehPicId: m.pic.id, sumber: "pic",
            persetujuan: "menunggu", decidedById: null, decidedAt: null, alasanTolak: null,
          },
        });
        if (r.count) hasil.diubah++;
        else hasil.terkunci.push(namaDari.get(b.employeeId) ?? `#${b.employeeId}`);
      } else {
        // Isi tidak berubah: persetujuan dibiarkan. Foto baru (kalau ada) tetap dipasang — foto
        // bukan dasar hitungan upah, jadi tidak membuat baris yang disetujui kembali menunggu.
        if (foto) await tx.rekapHarian.updateMany({ where: { id: l!.id, pembayaranId: null }, data: { fotoPath: foto } });
        hasil.tetap++;
      }
    }
  });

  if (hasil.baru + hasil.diubah > 0) await beritahuOwner(prisma, m.pic, m.tim, m.tanggal);
  return hasil;
}

/**
 * Paling banyak satu notifikasi per tim per tanggal per JEDA_NOTIF_MENIT. Penandanya notifikasi
 * terakhir itu sendiri (tabel Notification, data.timId + data.tanggal) — tidak perlu kolom baru.
 * Tidak atomik: dua simpan serentak di detik yang sama bisa memberi dua notifikasi. Jarang dan
 * tidak merugikan; yang dihindari adalah 20 notifikasi untuk 20 simpan beruntun.
 */
async function beritahuOwner(prisma: PrismaClient, pic: { fullName: string }, tim: TimRingkas, tanggal: Date) {
  const hari = ymd(tanggal);
  const now = Date.now();
  const terakhir = await prisma.notification.findFirst({
    where: {
      type: "rekap_tim",
      createdAt: { gte: new Date(now - JEDA_NOTIF_MENIT * 60 * 1000) },
      AND: [{ data: { path: "$.timId", equals: tim.id } }, { data: { path: "$.tanggal", equals: hari } }],
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (!bolehBeritahu(terakhir?.createdAt ?? null, now)) return;
  const menunggu = await prisma.rekapHarian.count({
    where: { tanggal, persetujuan: "menunggu", employee: { timId: tim.id } },
  });
  const teksTanggal = tanggal.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  await notifyManagers("rekap_tim", {
    title: "Rekap tim menunggu persetujuan",
    message: `${pic.fullName} · ${tim.nama} · ${teksTanggal} · ${menunggu} orang menunggu`,
    timId: tim.id,
    tanggal: hari,
    href: "/attendance/rekap-tim",
  });
}
