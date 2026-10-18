/**
 * Aturan kunjungan klien (canvassing) — MURNI, tanpa basis data, supaya tiap keputusan bisa diuji.
 *
 * Kunjungan BUKAN absensi: tidak menyentuh Attendance sama sekali. Ia catatan kerja lapangan
 * (sales/teknisi) — mulai di lokasi klien, selesai dengan hasilnya.
 *
 * Penanda "mencurigakan" sengaja cuma PENANDA untuk dibaca owner, bukan penolakan: GPS HP bisa
 * meleset di dalam gedung, dan kunjungan singkat kadang memang singkat (klien tidak ada).
 */
import { AKURASI_MAKS_M, jarakMeter } from "@/lib/services/absen-hp/aturan";

export { AKURASI_MAKS_M };

/** Kunjungan terbuka lebih lama dari ini dianggap tidak diselesaikan, dan tidak menahan yang baru. */
export const BATAS_TERBUKA_JAM = 12;
/** Penanda: titik masuk dan keluar berjauhan. */
export const PENANDA_JARAK_M = 1000;
/** Penanda: kunjungan selesai terlalu cepat. */
export const PENANDA_DURASI_MENIT = 3;
/** Penanda: GPS kabur (masih diterima sampai AKURASI_MAKS_M, tapi patut dicurigai). */
export const PENANDA_AKURASI_M = 100;

export const HASIL = ["tertarik", "deal", "follow_up", "tidak_tertarik", "lainnya"] as const;
export type Hasil = (typeof HASIL)[number];

export const LABEL_HASIL: Record<Hasil, string> = {
  tertarik: "Tertarik",
  deal: "Deal",
  follow_up: "Perlu follow up",
  tidak_tertarik: "Tidak tertarik",
  lainnya: "Lainnya",
};

export function labelHasil(h: string | null | undefined): string {
  if (!h) return "-";
  return (LABEL_HASIL as Record<string, string>)[h] ?? h;
}

const BATAS_TERBUKA_MS = BATAS_TERBUKA_JAM * 60 * 60 * 1000;

export type Titik = { lat: number; lng: number; akurasiM: number };

export type Penolakan = { ok: false; kode: string; alasan: string };

/** Titik GPS yang layak dipakai; null = sah. */
export function periksaTitik(t: Titik): Penolakan | null {
  if (![t.lat, t.lng, t.akurasiM].every(Number.isFinite) || Math.abs(t.lat) > 90 || Math.abs(t.lng) > 180 || t.akurasiM < 0) {
    return { ok: false, kode: "lokasi_kosong", alasan: "Lokasi HP tidak terbaca. Nyalakan GPS dan izinkan akses lokasi." };
  }
  if (t.akurasiM > AKURASI_MAKS_M) {
    return {
      ok: false,
      kode: "kabur",
      alasan: `Sinyal lokasi kurang akurat (±${Math.round(t.akurasiM)} m). Coba dekat jendela atau di luar ruangan, lalu ulangi.`,
    };
  }
  return null;
}

/** Kunjungan yang masih berlaku sebagai "sedang berjalan" (belum selesai dan belum lewat batas). */
export function masihTerbuka(k: { masukAt: Date; keluarAt: Date | null }, nowMs: number): boolean {
  return k.keluarAt === null && nowMs - k.masukAt.getTime() <= BATAS_TERBUKA_MS;
}

export type StatusKunjungan = "berjalan" | "selesai" | "tidak_selesai";

export function statusKunjungan(k: { masukAt: Date; keluarAt: Date | null }, nowMs: number): StatusKunjungan {
  if (k.keluarAt) return "selesai";
  return masihTerbuka(k, nowMs) ? "berjalan" : "tidak_selesai";
}

export type MasukanMulai = {
  namaKlien: string;
  titik: Titik;
  /** Kunjungan karyawan ini yang belum selesai (paling baru), kalau ada. */
  terbuka: { id: number; namaKlien: string; masukAt: Date; keluarAt: Date | null } | null;
  nowMs: number;
};

export type KeputusanMulai = { ok: true; namaKlien: string } | (Penolakan & { terbukaId?: number });

/** Boleh mulai kunjungan? Urutan: satu kunjungan terbuka dulu, baru isian & GPS. */
export function putuskanMulai(m: MasukanMulai): KeputusanMulai {
  if (m.terbuka && masihTerbuka(m.terbuka, m.nowMs)) {
    return {
      ok: false,
      kode: "masih_terbuka",
      terbukaId: m.terbuka.id,
      alasan: `Kunjungan ke ${m.terbuka.namaKlien} belum diselesaikan. Selesaikan dulu sebelum mulai yang baru.`,
    };
  }
  const nama = rapikanNama(m.namaKlien);
  if (nama.length < 2) return { ok: false, kode: "nama", alasan: "Tulis nama klien yang dikunjungi." };
  if (nama.length > 150) return { ok: false, kode: "nama", alasan: "Nama klien terlalu panjang (maks. 150 huruf)." };
  const t = periksaTitik(m.titik);
  if (t) return t;
  return { ok: true, namaKlien: nama };
}

export type MasukanSelesai = {
  kunjungan: { masukAt: Date; keluarAt: Date | null } | null;
  titik: Titik;
  hasil: string;
  nowMs: number;
};

export type KeputusanSelesai = { ok: true; hasil: Hasil } | Penolakan;

export function putuskanSelesai(m: MasukanSelesai): KeputusanSelesai {
  if (!m.kunjungan) return { ok: false, kode: "tidak_ada", alasan: "Kunjungan tidak ditemukan." };
  if (m.kunjungan.keluarAt) return { ok: false, kode: "sudah_selesai", alasan: "Kunjungan ini sudah diselesaikan." };
  if (!masihTerbuka(m.kunjungan, m.nowMs)) {
    return {
      ok: false,
      kode: "kedaluwarsa",
      alasan: `Kunjungan ini dibuka lebih dari ${BATAS_TERBUKA_JAM} jam lalu dan tercatat tidak diselesaikan. Mulai kunjungan baru kalau masih di lokasi.`,
    };
  }
  if (!(HASIL as readonly string[]).includes(m.hasil)) return { ok: false, kode: "hasil", alasan: "Pilih hasil kunjungan." };
  const t = periksaTitik(m.titik);
  if (t) return t;
  return { ok: true, hasil: m.hasil as Hasil };
}

/** Spasi dirapikan; nama klien dibandingkan tanpa beda huruf besar/kecil. */
export function rapikanNama(s: string): string {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

export function durasiMenit(masukAt: Date, keluarAt: Date | null): number | null {
  if (!keluarAt) return null;
  return Math.max(0, Math.round((keluarAt.getTime() - masukAt.getTime()) / 60000));
}

type KoordinatKunjungan = {
  masukLat: number;
  masukLng: number;
  keluarLat: number | null;
  keluarLng: number | null;
};

export function jarakMasukKeluar(k: KoordinatKunjungan): number | null {
  if (k.keluarLat === null || k.keluarLng === null) return null;
  return Math.round(jarakMeter(k.masukLat, k.masukLng, k.keluarLat, k.keluarLng));
}

export type Penanda = { kode: "jauh" | "singkat" | "kabur" | "tidak_selesai"; label: string };

export type KunjunganUntukPenanda = KoordinatKunjungan & {
  masukAt: Date;
  keluarAt: Date | null;
  masukAkurasiM: number;
  keluarAkurasiM: number | null;
};

/** Penanda untuk dibaca owner — bukan penolakan. */
export function penandaKunjungan(k: KunjunganUntukPenanda, nowMs: number): Penanda[] {
  const hasil: Penanda[] = [];
  const jarak = jarakMasukKeluar(k);
  if (jarak !== null && jarak > PENANDA_JARAK_M) {
    hasil.push({ kode: "jauh", label: `Titik selesai ${(jarak / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} km dari titik mulai` });
  }
  const durasi = durasiMenit(k.masukAt, k.keluarAt);
  if (durasi !== null && durasi < PENANDA_DURASI_MENIT) {
    hasil.push({ kode: "singkat", label: `Cuma ${durasi} menit` });
  }
  const akurasi = Math.max(k.masukAkurasiM, k.keluarAkurasiM ?? 0);
  if (akurasi > PENANDA_AKURASI_M) {
    hasil.push({ kode: "kabur", label: `GPS kurang akurat (±${Math.round(akurasi)} m)` });
  }
  if (statusKunjungan(k, nowMs) === "tidak_selesai") {
    hasil.push({ kode: "tidak_selesai", label: "Tidak diselesaikan" });
  }
  return hasil;
}

export type RingkasanKaryawan = {
  employeeId: number;
  nama: string;
  jumlah: number;
  selesai: number;
  totalMenit: number;
  deal: number;
  ditandai: number;
};

/** Ringkasan per karyawan, diurutkan jumlah kunjungan terbanyak. */
export function ringkasPerKaryawan(
  baris: readonly (KunjunganUntukPenanda & { employeeId: number; nama: string; hasil: string | null })[],
  nowMs: number,
): RingkasanKaryawan[] {
  const peta = new Map<number, RingkasanKaryawan>();
  for (const k of baris) {
    let r = peta.get(k.employeeId);
    if (!r) {
      r = { employeeId: k.employeeId, nama: k.nama, jumlah: 0, selesai: 0, totalMenit: 0, deal: 0, ditandai: 0 };
      peta.set(k.employeeId, r);
    }
    r.jumlah++;
    const d = durasiMenit(k.masukAt, k.keluarAt);
    if (d !== null) {
      r.selesai++;
      r.totalMenit += d;
    }
    if (k.hasil === "deal") r.deal++;
    if (penandaKunjungan(k, nowMs).length > 0) r.ditandai++;
  }
  return [...peta.values()].sort((a, b) => b.jumlah - a.jumlah || a.nama.localeCompare(b.nama, "id"));
}

/** Saran nama klien: dari yang paling baru, tanpa duplikat (abaikan huruf besar/kecil). */
export function saranNamaKlien(namaTerbaruDulu: readonly string[], batas = 30): string[] {
  const lihat = new Set<string>();
  const hasil: string[] = [];
  for (const n of namaTerbaruDulu) {
    const r = rapikanNama(n);
    const kunci = r.toLocaleLowerCase("id");
    if (!r || lihat.has(kunci)) continue;
    lihat.add(kunci);
    hasil.push(r);
    if (hasil.length >= batas) break;
  }
  return hasil;
}

/** Tautan Google Maps ke satu titik. */
export function tautanPeta(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
}
