/**
 * Aturan pengaturan upah tukang (Tahap 1): tarif kota × divisi dan proyek/event. MURNI —
 * tanpa Prisma — supaya bisa diuji. Yang memakai tarif untuk menghitung upah ada di agen
 * rekap upah; di sini cuma menjaga isian pengaturannya waras.
 */

/** Batas wajar upah harian. Lebih dari ini hampir pasti salah ketik (kelebihan nol). */
export const UPAH_HARIAN_MAKS = 10_000_000;
/** Batas wajar lembur per jam — sama dengan batas harian, cuma penjaga salah ketik. */
export const LEMBUR_PER_JAM_MAKS = 10_000_000;

/** Rapikan nama kota/divisi: buang spasi berlebih. Huruf besar-kecil dipertahankan untuk tampilan. */
export function rapikanNama(s: string | null | undefined): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

/** Kunci pembanding kota/divisi: tanpa beda huruf besar & spasi berlebih. */
export function kunciNama(s: string | null | undefined): string {
  return rapikanNama(s).toLocaleLowerCase("id-ID");
}

export type GalatTarif = { kolom: string; pesan: string };

/** Periksa satu angka rupiah: wajib angka, ≥ 0, ≤ batas. `null` boleh kalau `bolehKosong`. */
function periksaRupiah(
  nilai: number | null | undefined,
  kolom: string,
  label: string,
  maks: number,
  bolehKosong: boolean,
): GalatTarif | null {
  if (nilai === null || nilai === undefined) {
    return bolehKosong ? null : { kolom, pesan: `${label} wajib diisi.` };
  }
  if (!Number.isFinite(nilai)) return { kolom, pesan: `${label} harus berupa angka.` };
  if (nilai < 0) return { kolom, pesan: `${label} tidak boleh minus.` };
  if (nilai > maks) {
    return { kolom, pesan: `${label} terlalu besar (maks Rp ${maks.toLocaleString("id-ID")}). Periksa jumlah nolnya.` };
  }
  return null;
}

/** Validasi tarif kota × divisi. Kembalikan daftar galat (kosong = sah). */
export function validasiTarifKotaDivisi(t: {
  kota: string;
  divisi: string;
  upahHarian: number;
  lemburPerJam: number;
}): GalatTarif[] {
  const galat: GalatTarif[] = [];
  if (!rapikanNama(t.kota)) galat.push({ kolom: "kota", pesan: "Kota wajib diisi." });
  if (!rapikanNama(t.divisi)) galat.push({ kolom: "divisi", pesan: "Divisi wajib diisi." });
  const a = periksaRupiah(t.upahHarian, "upahHarian", "Upah harian", UPAH_HARIAN_MAKS, false);
  if (a) galat.push(a);
  const b = periksaRupiah(t.lemburPerJam, "lemburPerJam", "Lembur per jam", LEMBUR_PER_JAM_MAKS, false);
  if (b) galat.push(b);
  return galat;
}

/** Validasi tarif opsional (proyek / per karyawan): kosong boleh, isinya harus wajar. */
export function validasiTarifOpsional(t: {
  upahHarian?: number | null;
  lemburPerJam?: number | null;
}): GalatTarif[] {
  const galat: GalatTarif[] = [];
  const a = periksaRupiah(t.upahHarian, "upahHarian", "Upah harian", UPAH_HARIAN_MAKS, true);
  if (a) galat.push(a);
  const b = periksaRupiah(t.lemburPerJam, "lemburPerJam", "Lembur per jam", LEMBUR_PER_JAM_MAKS, true);
  if (b) galat.push(b);
  return galat;
}

/**
 * Apakah kombinasi kota+divisi sudah dipakai baris lain? Dibandingkan tanpa beda huruf besar,
 * karena "Jakarta/Tukang" dan "jakarta/tukang" akan dicocokkan sama oleh hitungan upah.
 */
export function cariDuplikat<T extends { id: number; kota: string; divisi: string }>(
  daftar: readonly T[],
  kota: string,
  divisi: string,
  kecualiId?: number,
): T | null {
  const k = kunciNama(kota);
  const d = kunciNama(divisi);
  return daftar.find((t) => t.id !== kecualiId && kunciNama(t.kota) === k && kunciNama(t.divisi) === d) ?? null;
}

/** Validasi proyek: nama wajib, selesai tidak sebelum mulai, tarif wajar. */
export function validasiProyek(p: {
  nama: string;
  mulai?: Date | null;
  selesai?: Date | null;
  upahHarian?: number | null;
  lemburPerJam?: number | null;
}): GalatTarif[] {
  const galat: GalatTarif[] = [];
  if (!rapikanNama(p.nama)) galat.push({ kolom: "nama", pesan: "Nama proyek wajib diisi." });
  if (p.mulai && p.selesai && p.selesai.getTime() < p.mulai.getTime()) {
    galat.push({ kolom: "selesai", pesan: "Tanggal selesai tidak boleh sebelum tanggal mulai." });
  }
  galat.push(...validasiTarifOpsional(p));
  return galat;
}

export type PutusanHapusProyek = { boleh: true } | { boleh: false; pesan: string };

/**
 * Proyek yang sudah dipakai rekap tidak boleh dihapus — riwayat upahnya akan kehilangan
 * proyeknya (dan tarif proyeknya). Yang begitu cukup dinonaktifkan.
 */
export function bolehHapusProyek(jumlahRekap: number): PutusanHapusProyek {
  if (jumlahRekap > 0) {
    return {
      boleh: false,
      pesan: `Proyek ini sudah dipakai di ${jumlahRekap} catatan harian, jadi tidak bisa dihapus. Nonaktifkan saja supaya tidak muncul lagi di pilihan.`,
    };
  }
  return { boleh: true };
}

export type SelMatriks = { id: number; upahHarian: number; lemburPerJam: number; aktif: boolean };
export type Matriks = { kota: string[]; divisi: string[]; sel: Record<string, SelMatriks> };

/** Kunci sel matriks untuk kota & divisi (tanpa beda huruf besar). */
export const kunciSel = (kota: string, divisi: string) => `${kunciNama(kota)}|${kunciNama(divisi)}`;

/**
 * Susun daftar tarif jadi matriks baris kota × kolom divisi. Nama yang tampil = ejaan pertama
 * yang ditemui (urutan abjad). Dipakai tampilan ringkas di halaman tarif.
 */
export function susunMatriks(
  daftar: readonly { id: number; kota: string; divisi: string; upahHarian: number; lemburPerJam: number; aktif: boolean }[],
): Matriks {
  const kota = new Map<string, string>();
  const divisi = new Map<string, string>();
  const sel: Record<string, SelMatriks> = {};
  for (const t of daftar) {
    const k = kunciNama(t.kota);
    const d = kunciNama(t.divisi);
    if (!kota.has(k)) kota.set(k, rapikanNama(t.kota));
    if (!divisi.has(d)) divisi.set(d, rapikanNama(t.divisi));
    sel[`${k}|${d}`] = { id: t.id, upahHarian: t.upahHarian, lemburPerJam: t.lemburPerJam, aktif: t.aktif };
  }
  const urut = (m: Map<string, string>) => [...m.values()].sort((a, b) => a.localeCompare(b, "id-ID"));
  return { kota: urut(kota), divisi: urut(divisi), sel };
}

/** Daftar nama unik (tanpa beda huruf besar), untuk saran isian kota/divisi. */
export function namaUnik(nama: readonly (string | null | undefined)[]): string[] {
  const m = new Map<string, string>();
  for (const n of nama) {
    const r = rapikanNama(n);
    if (r && !m.has(kunciNama(r))) m.set(kunciNama(r), r);
  }
  return [...m.values()].sort((a, b) => a.localeCompare(b, "id-ID"));
}

/** Pesan galat pertama sebagai satu kalimat, untuk dijawab ke layar. */
export function pesanGalat(galat: readonly GalatTarif[]): string {
  return galat[0]?.pesan ?? "";
}
