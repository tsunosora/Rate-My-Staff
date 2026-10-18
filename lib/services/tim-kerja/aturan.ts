/**
 * Tim kerja (TimKerja + Employee.timId) — aturan MURNI, supaya bisa diuji tanpa basis data.
 * Dipakai layar HP PIC ("Kelola tim") dan halaman admin Pengaturan → Tim kerja.
 *
 * Satu orang paling banyak di SATU tim. Memindahkan orang dari tim lain bukan wewenang PIC —
 * PIC A tidak boleh "mencuri" anggota PIC B; itu urusan admin.
 */

export type Tolak = { ok: false; kode: string; alasan: string };

export const NAMA_TIM_MAKS = 80;

export type CalonAnggota = {
  id: number;
  isActive: boolean;
  deletedAt: Date | null;
  timId: number | null;
  /** Nama tim tempat dia sekarang (kalau timId terisi) — untuk pesan penolakan. */
  namaTimSekarang?: string | null;
};

/**
 * Boleh orang ini dimasukkan ke tim `timId`?
 * - sudah di tim ini → boleh (tidak ada yang berubah; dianggap berhasil, supaya ketukan ganda aman).
 * - di tim lain → ditolak, kecuali `bolehPindah` (admin).
 */
export function bolehTambahAnggota(
  timId: number,
  calon: CalonAnggota | null,
  bolehPindah = false,
): { ok: true; sudahAnggota: boolean } | Tolak {
  if (!calon || calon.deletedAt || !calon.isActive) {
    return { ok: false, kode: "tidak_aktif", alasan: "Karyawan ini tidak ditemukan atau sudah tidak aktif." };
  }
  if (calon.timId === timId) return { ok: true, sudahAnggota: true };
  if (calon.timId !== null && !bolehPindah) {
    const nama = calon.namaTimSekarang?.trim() || "tim lain";
    return { ok: false, kode: "tim_lain", alasan: `Sudah di ${nama}. Minta admin memindahkannya.` };
  }
  return { ok: true, sudahAnggota: false };
}

/**
 * Boleh orang ini dikeluarkan dari tim? Kepala tim (TimKerja.picId) tidak bisa dikeluarkan —
 * tim tanpa kepala tidak punya yang merekap. Ganti kepala tim lewat admin.
 */
export function bolehKeluarkan(
  tim: { id: number; picId: number | null },
  anggota: { id: number; timId: number | null } | null,
): { ok: true } | Tolak {
  if (!anggota || anggota.timId !== tim.id) return { ok: false, kode: "bukan_anggota", alasan: "Orang ini bukan anggota tim ini." };
  if (tim.picId === anggota.id) return { ok: false, kode: "kepala_tim", alasan: "Kepala tim tidak bisa dikeluarkan. Minta admin mengganti kepala tim." };
  return { ok: true };
}

/**
 * Nama tim otomatis untuk PIC yang belum punya tim: "Tim <nama>", lalu " (2)", " (3)", … kalau
 * bentrok dengan nama yang sudah ada (tanpa beda huruf besar). Dipotong supaya muat NAMA_TIM_MAKS.
 */
export function namaTimBaru(namaPic: string, namaAda: readonly string[]): string {
  const dasar = `Tim ${String(namaPic ?? "").replace(/\s+/g, " ").trim() || "Lapangan"}`;
  const ada = new Set(namaAda.map((n) => n.trim().toLowerCase()));
  for (let i = 1; i < 1000; i++) {
    const akhiran = i === 1 ? "" : ` (${i})`;
    const nama = dasar.slice(0, NAMA_TIM_MAKS - akhiran.length).trimEnd() + akhiran;
    if (!ada.has(nama.toLowerCase())) return nama;
  }
  return `${dasar.slice(0, NAMA_TIM_MAKS - 14)} (${Date.now() % 1e9})`;
}

/**
 * Tim mana yang dipakai PIC ini? Urutan disengaja:
 * 1. tim yang DIA pimpin (TimKerja.picId = dia),
 * 2. tim tempat dia jadi anggota (Employee.timId) — PIC pengganti di tim orang lain,
 * 3. belum ada → "buat" (tim baru atas namanya, dia kepala sekaligus anggota).
 */
export function pilihTimPic(pic: { timId: number | null; timDipimpinId: number | null }):
  | { pakai: number; perluMasukkanPic: boolean }
  | { buat: true } {
  if (pic.timDipimpinId !== null) return { pakai: pic.timDipimpinId, perluMasukkanPic: pic.timId === null };
  if (pic.timId !== null) return { pakai: pic.timId, perluMasukkanPic: false };
  return { buat: true };
}
