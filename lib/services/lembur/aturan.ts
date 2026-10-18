/**
 * Aturan keputusan pengajuan lembur (hr.overtime) — semuanya fungsi MURNI supaya bisa diuji
 * tanpa database. Tanggal selalu "YYYY-MM-DD" (lokal), jam selalu "HH:MM".
 *
 * Satu sumber angka: menit lembur yang DIBAYAR tetap `Attendance.approvedOvertimeMinutes` di
 * baris scan PULANG. Pengajuan yang disetujui menulis ke sana; pembatalan menariknya kembali
 * hanya kalau nilainya masih persis yang ditulis persetujuan itu.
 */
import { dayNumber, fromDayNumber } from "@/lib/services/leave/range";

/** Karyawan boleh mengajukan untuk hari ini atau mundur sampai 7 hari (lembur sesudah dikerjakan). */
export const MAKS_MUNDUR_KARYAWAN = 7;
/** Owner/HR mencatat langsung — boleh lebih jauh (koreksi penggajian bulan lalu). */
export const MAKS_MUNDUR_ADMIN = 62;
/** Batas atas satu pengajuan: 16 jam. Lebih dari itu hampir pasti salah ketik. */
export const MAKS_MENIT = 16 * 60;

export type Hasil<T> = { ok: true; nilai: T } | { ok: false; error: string };

const RE_YMD = /^(\d{4})-(\d{2})-(\d{2})$/;
const RE_HM = /^(\d{2}):(\d{2})$/;

/** "YYYY-MM-DD" yang benar-benar ada di kalender (bukan 2026-02-30). */
export function ymdSah(ymd: string): boolean {
  const m = RE_YMD.exec(ymd);
  if (!m) return false;
  return fromDayNumber(dayNumber(ymd)) === ymd;
}

/** "HH:MM" → menit sejak tengah malam; null kalau tidak sah (jam 00–23, menit 00–59). */
export function menitDariJam(hm: string): number | null {
  const m = RE_HM.exec(hm);
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (h > 23 || mm > 59) return null;
  return h * 60 + mm;
}

/**
 * Durasi rentang jam. Selesai ≤ mulai dibaca LEWAT TENGAH MALAM (22:00–02:00 = 240 menit).
 * Mulai == selesai ditolak: tidak bisa dibedakan antara 0 menit dan 24 jam.
 */
export function menitDariRentang(mulai: string, selesai: string): Hasil<number> {
  const a = menitDariJam(mulai);
  const b = menitDariJam(selesai);
  if (a === null || b === null) return { ok: false, error: "Format jam harus HH:MM." };
  if (a === b) return { ok: false, error: "Jam mulai dan selesai tidak boleh sama." };
  return { ok: true, nilai: b > a ? b - a : b + 1440 - a };
}

export type InputDurasi = {
  mulai?: string | null;
  selesai?: string | null;
  menit?: number | null;
};

export type Durasi = { menit: number; mulai: string | null; selesai: string | null };

/**
 * Tentukan menit pengajuan. Kalau jam mulai DAN selesai diisi, menit dihitung dari rentangnya
 * (angka menit yang ikut dikirim diabaikan — rentang lebih bisa dicek). Kalau cuma salah satu
 * jam diisi, ditolak. Tanpa jam, `menit` wajib.
 */
export function tentukanDurasi(input: InputDurasi): Hasil<Durasi> {
  const mulai = input.mulai?.trim() || null;
  const selesai = input.selesai?.trim() || null;
  let menit: number;
  if (mulai || selesai) {
    if (!mulai || !selesai) {
      return { ok: false, error: "Isi jam mulai dan jam selesai, atau kosongkan keduanya lalu isi jumlah menit." };
    }
    const r = menitDariRentang(mulai, selesai);
    if (!r.ok) return r;
    menit = r.nilai;
  } else {
    if (input.menit === null || input.menit === undefined || !Number.isFinite(input.menit)) {
      return { ok: false, error: "Isi jam mulai–selesai atau jumlah menit lembur." };
    }
    menit = Math.round(input.menit);
  }
  const cek = cekMenit(menit);
  if (!cek.ok) return cek;
  return { ok: true, nilai: { menit, mulai, selesai } };
}

/** Menit lembur sah: 1 sampai MAKS_MENIT. Dipakai juga untuk menit yang disetujui owner. */
export function cekMenit(menit: number): Hasil<number> {
  if (!Number.isInteger(menit) || menit < 1) return { ok: false, error: "Lembur minimal 1 menit." };
  if (menit > MAKS_MENIT) return { ok: false, error: `Lembur maksimal ${MAKS_MENIT / 60} jam per hari.` };
  return { ok: true, nilai: menit };
}

/**
 * Tanggal lembur: tidak boleh di masa depan (lembur diajukan untuk yang sudah/sedang dikerjakan)
 * dan tidak lebih dari `maksMundur` hari ke belakang.
 */
export function cekTanggalLembur(tanggal: string, hariIni: string, maksMundur: number): Hasil<string> {
  if (!ymdSah(tanggal)) return { ok: false, error: "Tanggal tidak sah." };
  const selisih = dayNumber(hariIni) - dayNumber(tanggal);
  if (selisih < 0) return { ok: false, error: "Lembur tidak bisa diajukan untuk tanggal yang belum lewat." };
  if (selisih > maksMundur) {
    return { ok: false, error: `Lembur hanya bisa diajukan paling lama ${maksMundur} hari ke belakang.` };
  }
  return { ok: true, nilai: tanggal };
}

export type PengajuanRingkas = { id: number; tanggal: string; status: string };

/** Pengajuan aktif (menunggu/disetujui) lain di tanggal yang sama — satu tanggal satu pengajuan. */
export function cariBentrok(
  daftar: PengajuanRingkas[],
  tanggal: string,
  abaikanId?: number
): PengajuanRingkas | null {
  return (
    daftar.find(
      (p) =>
        p.tanggal === tanggal &&
        (p.status === "pending" || p.status === "approved") &&
        p.id !== abaikanId
    ) ?? null
  );
}

export type BarisScan = { id: number; scanDate: Date; scanType: string | null };

/**
 * Baris pulang yang menerima menit lembur: scan bertipe "out" PALING AKHIR di tanggal itu —
 * sama dengan jam pulang yang dipakai laporan absensi. Tidak ada scan pulang = null.
 */
export function pilihBarisPulang<T extends BarisScan>(baris: T[]): T | null {
  let pilih: T | null = null;
  for (const b of baris) {
    if (b.scanType !== "out") continue;
    if (!pilih || b.scanDate.getTime() >= pilih.scanDate.getTime()) pilih = b;
  }
  return pilih;
}

export type KeputusanTarik =
  | { ubah: true; nilai: 0 }
  | { ubah: false; alasan: "diubah_manual"; nilaiSekarang: number };

/**
 * Saat persetujuan dibatalkan: nol-kan approvedOvertimeMinutes HANYA kalau nilainya masih persis
 * yang ditulis persetujuan ini. Kalau owner sudah mengubahnya manual di absensi, biarkan —
 * angka itu keputusan orang, bukan sisa persetujuan.
 */
export function keputusanTarik(nilaiSekarang: number, menitDitulis: number): KeputusanTarik {
  if (nilaiSekarang === menitDitulis) return { ubah: true, nilai: 0 };
  return { ubah: false, alasan: "diubah_manual", nilaiSekarang };
}

export type StatusPenerapan = "diterapkan" | "belum_ada_scan_pulang" | "berbeda";

/**
 * Keadaan pengajuan yang DISETUJUI terhadap absensi:
 * - diterapkan            : baris pulang ada dan nilainya = menit yang disetujui
 * - belum_ada_scan_pulang : belum ada baris pulang; menit tercatat di pengajuan saja
 * - berbeda               : baris pulang ada tapi nilainya lain (diubah manual, atau scan pulang
 *                           datang sesudah persetujuan) → bisa "Terapkan ulang"
 */
export function statusPenerapan(nilaiBarisPulang: number | null, menitDisetujui: number): StatusPenerapan {
  if (nilaiBarisPulang === null) return "belum_ada_scan_pulang";
  return nilaiBarisPulang === menitDisetujui ? "diterapkan" : "berbeda";
}

/**
 * Menit lembur yang dibayar di struk untuk satu hari: yang dihitung dari jam scan, atau yang
 * disetujui (approvedOvertimeMinutes), mana yang LEBIH BESAR. Persetujuan menambah lembur yang
 * tidak terlihat di jam scan, tanpa menggandakan lembur yang sudah terhitung otomatis.
 */
export function menitLemburStruk(dariScan: number, disetujui: number): number {
  return Math.max(0, dariScan, disetujui);
}

/** "90" → "1 j 30 m" untuk teks notifikasi. */
export function teksDurasi(menit: number): string {
  const j = Math.floor(menit / 60);
  const m = menit % 60;
  if (j === 0) return `${m} menit`;
  return m === 0 ? `${j} jam` : `${j} jam ${m} menit`;
}
