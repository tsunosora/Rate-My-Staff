/**
 * Absen tim oleh PIC lapangan — aturan MURNI (tanpa basis data), supaya tiap keputusan bisa diuji.
 *
 * Keputusan owner 18 Okt 2026: tukang lapangan (sebagian freelance, banyak yang tanpa HP) bekerja
 * di venue yang berpindah-pindah. PIC (karyawan yang ditandai owner) mengabsenkan anggotanya dari
 * HP PIC: satu SESI per tempat kerja per hari, titiknya GPS HP PIC saat membuka sesi. Tiap absen
 * yang dicatat PIC MENUNGGU persetujuan owner/HR — baru saat disetujui lahir baris Attendance.
 *
 * Pengaman yang SAMA dengan absen HP (dipakai ulang dari ../absen-hp/aturan, bukan disalin): HP PIC
 * harus HP yang terkunci untuknya, GPS harus akurat (≤ AKURASI_MAKS_M), foto wajib, jeda ketukan
 * ganda. Yang DIGANTI persetujuan: syarat radius lokasi — tempatnya memang berpindah-pindah.
 */
import { AKURASI_MAKS_M, JEDA_MENIT, jarakMeter, sidikPerangkat } from "../absen-hp/aturan";

export { AKURASI_MAKS_M, JEDA_MENIT, jarakMeter };

export const NAMA_TEMPAT_MAKS = 150;
export const NAMA_FREELANCE_MAKS = 150;
/** Notifikasi ke owner paling banyak sekali per sesi dalam jendela ini. */
export const JEDA_NOTIF_MENIT = 30;

export type Jenis = "in" | "out";
export type StatusBaris = "menunggu" | "diterima" | "ditolak";

export type Tolak = { ok: false; kode: string; alasan: string };

/** Hari kalender LOKAL yang sama (zona server) — batas sesi = tengah malam, sama dengan absen HP. */
export function samaHari(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function awalHari(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export type Pic = {
  isActive: boolean;
  absenHp: boolean;
  bisaAbsenTim: boolean;
  absenHpPerangkat: string | null; // sidik HP yang terkunci untuk PIC, atau null
};

/**
 * Boleh orang ini bertindak sebagai PIC dari HP ini? Dipanggil di SETIAP aksi tim (bukan cuma saat
 * membuka sesi): owner yang mencabut tanda PIC atau melepas kunci HP harus langsung berlaku.
 * HP pertama yang dipakai terkunci, sama dengan absen HP — `kunciPerangkat` memberi tahu pemanggil.
 */
export function periksaPic(pic: Pic, idPerangkat: string): { ok: true; sidik: string; kunciPerangkat: boolean } | Tolak {
  if (!pic.isActive) return { ok: false, kode: "tidak_aktif", alasan: "Akun Anda tidak aktif." };
  if (!pic.absenHp) return { ok: false, kode: "absen_hp_mati", alasan: "Absen lewat HP belum dinyalakan untuk Anda. Hubungi owner." };
  if (!pic.bisaAbsenTim) return { ok: false, kode: "bukan_pic", alasan: "Anda belum ditandai sebagai PIC yang boleh mengabsenkan tim. Hubungi owner." };
  const id = String(idPerangkat ?? "").trim();
  if (id.length < 16 || id.length > 128) return { ok: false, kode: "perangkat", alasan: "HP ini tidak dikenali. Muat ulang halaman lalu coba lagi." };
  const sidik = sidikPerangkat(id);
  if (pic.absenHpPerangkat && pic.absenHpPerangkat !== sidik) {
    return { ok: false, kode: "hp_lain", alasan: "Akun Anda terkunci ke HP lain. Minta owner melepas kunci HP kalau Anda ganti HP." };
  }
  return { ok: true, sidik, kunciPerangkat: !pic.absenHpPerangkat };
}

/** GPS sah & cukup akurat. Dipakai saat membuka sesi DAN tiap absen anggota (diambil ulang). */
export function periksaGps(lat: number, lng: number, akurasiM: number): { ok: true } | Tolak {
  if (![lat, lng, akurasiM].every(Number.isFinite) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { ok: false, kode: "lokasi_kosong", alasan: "Lokasi HP tidak terbaca. Nyalakan GPS dan izinkan akses lokasi." };
  }
  if (akurasiM > AKURASI_MAKS_M) {
    return { ok: false, kode: "kabur", alasan: `Sinyal lokasi kurang akurat (±${Math.round(akurasiM)} m). Coba dekat jendela atau di luar ruangan.` };
  }
  return { ok: true };
}

/** Nama tempat dibersihkan (spasi ganda dirapatkan). Kosong / terlalu panjang = galat. */
export function bersihkanNamaTempat(nama: string | null | undefined): { ok: true; nama: string } | Tolak {
  const n = String(nama ?? "").replace(/\s+/g, " ").trim();
  if (n.length < 2) return { ok: false, kode: "tempat_kosong", alasan: "Tulis nama tempat kerjanya, mis. \"JCC Hall B\"." };
  if (n.length > NAMA_TEMPAT_MAKS) return { ok: false, kode: "tempat_panjang", alasan: `Nama tempat terlalu panjang (maksimal ${NAMA_TEMPAT_MAKS} huruf).` };
  return { ok: true, nama: n };
}

const kunciNama = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

/**
 * Sesi hari ini milik PIC yang namanya sama dibuka lagi, bukan dibuat dobel — PIC yang memuat
 * ulang halaman atau kembali sesudah istirahat tidak boleh memecah satu hari kerja jadi dua sesi.
 * Tempat BERBEDA di hari yang sama tetap sesi baru (pindah venue siang hari).
 */
export function sesiYangDipakaiUlang<T extends { namaTempat: string; mulaiAt: Date }>(
  sesiPic: readonly T[],
  namaTempat: string,
  now: Date,
): T | null {
  const k = kunciNama(namaTempat);
  return sesiPic.find((s) => samaHari(s.mulaiAt, now) && kunciNama(s.namaTempat) === k) ?? null;
}

/** Saran nama tempat dari sesi PIC sebelumnya: terbaru dulu, tanpa dobel (abaikan huruf besar). */
export function saranTempat(riwayat: readonly { namaTempat: string }[], maks = 8): string[] {
  const lihat = new Set<string>();
  const hasil: string[] = [];
  for (const r of riwayat) {
    const k = kunciNama(r.namaTempat);
    if (!k || lihat.has(k)) continue;
    lihat.add(k);
    hasil.push(r.namaTempat.trim());
    if (hasil.length >= maks) break;
  }
  return hasil;
}

export type MasukanAnggota = {
  picId: number;
  sesi: { picId: number; mulaiAt: Date; lat: number; lng: number };
  anggota: { id: number; isActive: boolean; deletedAt: Date | null } | null;
  jenis: string;
  /** Baris tim terakhir untuk orang & jenis yang sama (status apa pun kecuali ditolak), atau null. */
  terakhirSamaJenis: Date | null;
  lat: number;
  lng: number;
  akurasiM: number;
  nowMs: number;
};

/** Boleh PIC mencatat absen anggota ini sekarang? Urutan pemeriksaannya disengaja. */
export function putuskanAbsenAnggota(m: MasukanAnggota): { ok: true; jenis: Jenis; jarakM: number } | Tolak {
  if (m.sesi.picId !== m.picId) return { ok: false, kode: "sesi_lain", alasan: "Sesi ini bukan milik Anda." };
  if (!samaHari(m.sesi.mulaiAt, new Date(m.nowMs))) {
    return { ok: false, kode: "sesi_lewat", alasan: "Sesi ini sudah lewat harinya. Mulai sesi baru untuk hari ini." };
  }
  if (m.jenis !== "in" && m.jenis !== "out") return { ok: false, kode: "jenis", alasan: "Pilih Masuk atau Pulang." };
  if (!m.anggota || m.anggota.deletedAt || !m.anggota.isActive) {
    return { ok: false, kode: "anggota", alasan: "Karyawan ini tidak ditemukan atau sudah tidak aktif." };
  }
  // PIC mengabsen dirinya lewat absen HP biasa (jalur lama, langsung tercatat) — di sini tidak,
  // supaya satu orang tidak punya dua catatan masuk dari dua jalur berbeda.
  if (m.anggota.id === m.picId) {
    return { ok: false, kode: "diri_sendiri", alasan: "Absen Anda sendiri lewat tombol Absen Masuk/Pulang di halaman utama." };
  }
  if (m.terakhirSamaJenis && m.nowMs - m.terakhirSamaJenis.getTime() < JEDA_MENIT * 60 * 1000) {
    return { ok: false, kode: "baru_saja", alasan: `Orang ini baru saja diabsen. Tunggu ${JEDA_MENIT} menit kalau memang mau mengulang.` };
  }
  const gps = periksaGps(m.lat, m.lng, m.akurasiM);
  if (!gps.ok) return gps;
  return { ok: true, jenis: m.jenis, jarakM: Math.round(jarakMeter(m.lat, m.lng, m.sesi.lat, m.sesi.lng)) };
}

/** Transisi status satu baris. Cuma "menunggu" yang bisa diputus, dan sekali saja. */
export function transisi(status: string, attendanceId: number | null, aksi: "setujui" | "tolak"): { ok: true; ke: StatusBaris } | Tolak {
  if (status !== "menunggu") return { ok: false, kode: "sudah_diputus", alasan: "Absen ini sudah diputuskan." };
  if (attendanceId !== null) return { ok: false, kode: "sudah_tercatat", alasan: "Absen ini sudah tercatat di absensi." };
  return { ok: true, ke: aksi === "setujui" ? "diterima" : "ditolak" };
}

/** Hitungan per status untuk satu sesi. */
export function hitungStatus(baris: readonly { status: string }[]): Record<StatusBaris, number> {
  const h: Record<StatusBaris, number> = { menunggu: 0, diterima: 0, ditolak: 0 };
  for (const b of baris) if (b.status in h) h[b.status as StatusBaris]++;
  return h;
}

/** Boleh mengirim notifikasi untuk sesi ini sekarang? (paling banyak satu per JEDA_NOTIF_MENIT) */
export function bolehBeritahu(terakhir: Date | null, nowMs: number): boolean {
  return !terakhir || nowMs - terakhir.getTime() >= JEDA_NOTIF_MENIT * 60 * 1000;
}

/** Batas waktu untuk updateMany bersyarat: notifikasi sebelum ini boleh ditimpa. */
export function batasBeritahu(nowMs: number): Date {
  return new Date(nowMs - JEDA_NOTIF_MENIT * 60 * 1000);
}

/** Nomor HP freelance: angka saja, 0812… / 62812… / +62812…. Kosong boleh. */
export function bersihkanHp(hp: string | null | undefined): { ok: true; hp: string | null } | Tolak {
  const mentah = String(hp ?? "").trim();
  if (!mentah) return { ok: true, hp: null };
  const angka = mentah.replace(/[\s\-().]/g, "").replace(/^\+/, "");
  if (!/^\d{8,15}$/.test(angka)) return { ok: false, kode: "hp_salah", alasan: "Nomor HP tidak sah. Tulis angka saja, mis. 081234567890, atau kosongkan." };
  return { ok: true, hp: angka };
}

export type MasukanFreelance = {
  nama: string;
  hp?: string | null;
  /** Nama karyawan AKTIF yang sudah ada — untuk mencegah dobel tanpa sengaja. */
  namaAda: readonly string[];
  /** PIC menegaskan memang orang yang berbeda dengan nama yang sama. */
  tetapDaftarkan: boolean;
};

/** Pendaftaran tukang freelance oleh PIC. Batas paket diperiksa terpisah (lisensi), bukan di sini. */
export function putuskanFreelance(m: MasukanFreelance): { ok: true; nama: string; hp: string | null } | (Tolak & { namaAda?: boolean }) {
  const nama = String(m.nama ?? "").replace(/\s+/g, " ").trim();
  if (nama.length < 2) return { ok: false, kode: "nama_kosong", alasan: "Tulis nama lengkap tukangnya." };
  if (nama.length > NAMA_FREELANCE_MAKS) return { ok: false, kode: "nama_panjang", alasan: `Nama terlalu panjang (maksimal ${NAMA_FREELANCE_MAKS} huruf).` };
  const hp = bersihkanHp(m.hp);
  if (!hp.ok) return hp;
  if (!m.tetapDaftarkan && m.namaAda.some((n) => kunciNama(n) === kunciNama(nama))) {
    return {
      ok: false,
      kode: "nama_ada",
      namaAda: true,
      alasan: `"${nama}" sudah terdaftar. Cari namanya di daftar anggota — atau daftarkan tetap kalau memang orang yang berbeda.`,
    };
  }
  return { ok: true, nama, hp: hp.hp };
}
