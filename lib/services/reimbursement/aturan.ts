/**
 * Aturan reimbursement (klaim pengeluaran karyawan). Modul MURNI — tanpa Prisma, tanpa disk —
 * supaya tiap keputusan bisa diuji langsung dan dipakai sama persis oleh portal & dasbor.
 *
 * Alur status:
 *   menunggu ──setujui──> disetujui ──bayar──> dibayar   (akhir; tidak bisa dibalik dari sini)
 *      │                      │
 *      └──tolak──> ditolak    └──buka──> menunggu
 *                    └──buka──> menunggu
 * Karyawan cuma boleh MEMBATALKAN klaimnya sendiri selama masih "menunggu" (barisnya dihapus).
 */

export const KATEGORI = ["transport", "makan", "bensin", "parkir", "belanja", "lainnya"] as const;
export type Kategori = (typeof KATEGORI)[number];

export const LABEL_KATEGORI: Record<Kategori, string> = {
  transport: "Transport",
  makan: "Makan",
  bensin: "Bensin",
  parkir: "Parkir",
  belanja: "Belanja",
  lainnya: "Lainnya",
};

export const STATUS = ["menunggu", "disetujui", "ditolak", "dibayar"] as const;
export type StatusReimburse = (typeof STATUS)[number];

export const LABEL_STATUS: Record<StatusReimburse, string> = {
  menunggu: "Menunggu",
  disetujui: "Disetujui",
  ditolak: "Ditolak",
  dibayar: "Dibayar",
};

/** Batas wajar satu klaim — angka di atasnya hampir pasti salah ketik (kelebihan nol). */
export const JUMLAH_MAKS = 50_000_000;
/** Nota boleh diajukan paling lambat sekian hari sesudah tanggal belanjanya. */
export const MAKS_MUNDUR_HARI = 60;

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "YYYY-MM-DD" -> nomor hari (UTC, bebas zona waktu). null kalau bukan tanggal sungguhan. */
function nomorHari(ymd: string): number | null {
  if (!YMD_RE.test(ymd)) return null;
  const [y, m, d] = ymd.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d);
  const cek = new Date(t);
  if (cek.getUTCFullYear() !== y || cek.getUTCMonth() !== m - 1 || cek.getUTCDate() !== d) return null;
  return Math.floor(t / 86400000);
}

export type Hasil = { ok: true } | { ok: false; error: string };

/** Tanggal pengeluaran: tidak di masa depan, tidak lebih dari MAKS_MUNDUR_HARI ke belakang. */
export function cekTanggal(ymd: string, hariIni: string): Hasil {
  const n = nomorHari(ymd);
  const sekarang = nomorHari(hariIni);
  if (n === null || sekarang === null) return { ok: false, error: "Tanggal tidak valid." };
  if (n > sekarang) return { ok: false, error: "Tanggal pengeluaran tidak boleh di masa depan." };
  if (sekarang - n > MAKS_MUNDUR_HARI) {
    return { ok: false, error: `Nota lebih dari ${MAKS_MUNDUR_HARI} hari tidak bisa diklaim lagi.` };
  }
  return { ok: true };
}

/**
 * Jumlah Rupiah: angka positif, paling banyak 2 desimal, ≤ JUMLAH_MAKS.
 * Menerima "15.000" / "15000" / 15000 — titik ribuan gaya Indonesia dibuang dulu,
 * koma dianggap pemisah desimal.
 */
export function parseJumlah(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  let s = v.trim().replace(/^rp\.?\s*/i, "").replace(/\s/g, "");
  if (!s) return null;
  if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  return Number(s);
}

export function cekJumlah(n: number | null): Hasil {
  if (n === null || !Number.isFinite(n)) return { ok: false, error: "Jumlah tidak valid." };
  if (n <= 0) return { ok: false, error: "Jumlah harus lebih dari nol." };
  if (Math.round(n * 100) !== n * 100) return { ok: false, error: "Jumlah paling banyak 2 angka desimal." };
  if (n > JUMLAH_MAKS) {
    return { ok: false, error: `Jumlah melebihi batas Rp${JUMLAH_MAKS.toLocaleString("id-ID")} per klaim.` };
  }
  return { ok: true };
}

export type AksiOwner = "setujui" | "tolak" | "bayar" | "buka";

/**
 * Perubahan baris yang harus ditulis untuk satu keputusan. Medan yang `undefined` = jangan
 * disentuh (mis. menandai dibayar tidak menimpa jumlah & catatan persetujuan).
 */
export type Rencana = {
  status: StatusReimburse;
  jumlahDisetujui?: number | null;
  catatanKeputusan?: string | null;
  /** isi = decidedAt/decidedById diisi sekarang; kosongkan = dibuka kembali; tetap = tidak disentuh. */
  pemutus: "isi" | "kosongkan" | "tetap";
  dibayarAt?: Date | null;
};

export type HasilRencana = { ok: true; rencana: Rencana } | { ok: false; error: string };

/**
 * Keputusan owner atas satu klaim. Murni: menerima keadaan baris sekarang, mengembalikan apa
 * yang harus ditulis — atau alasan menolak (status tidak cocok, jumlah/catatan tidak sah).
 */
export function rencanakan(a: {
  status: string;
  jumlah: number;
  aksi: AksiOwner;
  jumlahDisetujui?: number | null;
  catatan?: string | null;
  now: Date;
}): HasilRencana {
  const catatan = a.catatan?.trim() ? a.catatan.trim() : null;
  switch (a.aksi) {
    case "setujui": {
      if (a.status !== "menunggu") return { ok: false, error: `Klaim sudah berstatus "${a.status}".` };
      const disetujui = a.jumlahDisetujui ?? a.jumlah;
      const cek = cekJumlah(disetujui);
      if (!cek.ok) return cek;
      if (disetujui > a.jumlah) {
        return { ok: false, error: "Jumlah disetujui tidak boleh lebih besar dari yang diajukan." };
      }
      return {
        ok: true,
        rencana: { status: "disetujui", jumlahDisetujui: disetujui, catatanKeputusan: catatan, pemutus: "isi", dibayarAt: null },
      };
    }
    case "tolak": {
      if (a.status !== "menunggu") return { ok: false, error: `Klaim sudah berstatus "${a.status}".` };
      if (!catatan) return { ok: false, error: "Tulis alasan penolakan untuk karyawan." };
      return {
        ok: true,
        rencana: { status: "ditolak", jumlahDisetujui: null, catatanKeputusan: catatan, pemutus: "isi", dibayarAt: null },
      };
    }
    case "bayar": {
      if (a.status !== "disetujui") return { ok: false, error: "Hanya klaim yang sudah disetujui yang bisa ditandai dibayar." };
      return {
        ok: true,
        // jumlah, catatan, dan pemutus persetujuan dipertahankan apa adanya.
        rencana: { status: "dibayar", pemutus: "tetap", dibayarAt: a.now },
      };
    }
    case "buka": {
      if (a.status === "dibayar") return { ok: false, error: "Klaim yang sudah dibayar tidak bisa dibatalkan keputusannya." };
      if (a.status !== "disetujui" && a.status !== "ditolak") {
        return { ok: false, error: "Klaim ini belum diputuskan." };
      }
      return {
        ok: true,
        rencana: { status: "menunggu", jumlahDisetujui: null, catatanKeputusan: null, pemutus: "kosongkan", dibayarAt: null },
      };
    }
  }
}

/** Karyawan boleh membatalkan klaimnya sendiri hanya selama masih menunggu. */
export function bolehDibatalkanKaryawan(status: string): boolean {
  return status === "menunggu";
}

/** Jumlah yang dihitung untuk satu klaim di ringkasan: yang disetujui kalau ada, kalau tidak yang diajukan. */
export function jumlahBerlaku(r: { status: string; jumlah: number; jumlahDisetujui: number | null }): number {
  if ((r.status === "disetujui" || r.status === "dibayar") && r.jumlahDisetujui !== null) return r.jumlahDisetujui;
  return r.jumlah;
}

/** Ringkasan per status: banyak klaim + total Rupiah. */
export function ringkas(
  rows: { status: string; jumlah: number; jumlahDisetujui: number | null }[]
): Record<StatusReimburse, { jumlahKlaim: number; total: number }> {
  const out = Object.fromEntries(STATUS.map((s) => [s, { jumlahKlaim: 0, total: 0 }])) as Record<
    StatusReimburse,
    { jumlahKlaim: number; total: number }
  >;
  for (const r of rows) {
    const s = out[r.status as StatusReimburse];
    if (!s) continue;
    s.jumlahKlaim += 1;
    s.total = Math.round((s.total + jumlahBerlaku(r)) * 100) / 100;
  }
  return out;
}

/** "2026-10" -> [awal bulan, awal bulan berikutnya) dalam waktu lokal. null kalau tidak sah. */
export function rentangBulan(bulan: string): { mulai: Date; akhir: Date } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(bulan);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12) return null;
  return { mulai: new Date(y, mo - 1, 1), akhir: new Date(y, mo, 1) };
}
