import { z } from "zod";

/**
 * Inventaris kantor: barang yang dipinjamkan ke karyawan (seragam, laptop, kunci, kartu ID).
 *
 * MURNI (tanpa Prisma) supaya hitungannya bisa diuji: unit "dipegang" selalu dihitung dari
 * peminjaman yang belum kembali, bukan disimpan — satu sumber kebenaran, tidak bisa menyimpang.
 */

export const KATEGORI_INVENTARIS = ["seragam", "laptop", "kunci", "kartu_id", "elektronik", "lainnya"] as const;
export type KategoriInventaris = (typeof KATEGORI_INVENTARIS)[number];

export const LABEL_KATEGORI: Record<KategoriInventaris, string> = {
  seragam: "Seragam",
  laptop: "Laptop",
  kunci: "Kunci",
  kartu_id: "Kartu ID",
  elektronik: "Elektronik",
  lainnya: "Lainnya",
};

export const KONDISI_KEMBALI = ["baik", "rusak", "hilang"] as const;

export const inventarisCreateSchema = z.object({
  nama: z.string().trim().min(1, "Nama wajib diisi").max(150),
  kategori: z.enum(KATEGORI_INVENTARIS).default("lainnya"),
  keterangan: z.string().trim().max(500).optional().nullable(),
  jumlah: z.coerce.number().int().min(1, "Jumlah minimal 1").max(100000),
});

export const inventarisUpdateSchema = z.object({
  nama: z.string().trim().min(1).max(150).optional(),
  kategori: z.enum(KATEGORI_INVENTARIS).optional(),
  keterangan: z.string().trim().max(500).optional().nullable(),
  jumlah: z.coerce.number().int().min(0).max(100000).optional(),
  rusakHilang: z.coerce.number().int().min(0).max(100000).optional(),
  aktif: z.boolean().optional(),
});

export const pinjamSchema = z.object({
  employeeId: z.coerce.number().int().positive(),
  jumlah: z.coerce.number().int().min(1).max(100000).default(1),
  catatan: z.string().trim().max(255).optional().nullable(),
});

export const kembaliSchema = z.object({
  peminjamanId: z.coerce.number().int().positive(),
  kondisi: z.enum(KONDISI_KEMBALI).default("baik"),
  catatan: z.string().trim().max(255).optional().nullable(),
});

export type PeminjamanLike = { jumlah: number; dikembalikanPada: Date | string | null };
export type BarangLike = { jumlah: number; rusakHilang: number; peminjaman: PeminjamanLike[] };

export type HitunganBarang = { dipegang: number; tersedia: number; rusakHilang: number };

/** Dipegang = peminjaman yang belum kembali; tersedia = sisanya yang masih layak pakai. */
export function hitungBarang(b: BarangLike): HitunganBarang {
  const dipegang = b.peminjaman.filter((p) => !p.dikembalikanPada).reduce((s, p) => s + p.jumlah, 0);
  const rusakHilang = Math.max(0, b.rusakHilang);
  return { dipegang, rusakHilang, tersedia: Math.max(0, b.jumlah - dipegang - rusakHilang) };
}

export function ringkasInventaris(list: HitunganBarang[]): HitunganBarang & { barang: number } {
  return list.reduce<HitunganBarang & { barang: number }>(
    (s, h) => ({
      barang: s.barang + 1,
      dipegang: s.dipegang + h.dipegang,
      tersedia: s.tersedia + h.tersedia,
      rusakHilang: s.rusakHilang + h.rusakHilang,
    }),
    { barang: 0, dipegang: 0, tersedia: 0, rusakHilang: 0 }
  );
}

/**
 * Jumlah unit tidak boleh lebih kecil dari yang sedang dipegang + yang rusak/hilang —
 * kalau boleh, "tersedia" diam-diam menjadi negatif. Null = sah, selain itu pesan galatnya.
 */
export function cekJumlahBaru(jumlah: number, rusakHilang: number, dipegang: number): string | null {
  if (jumlah < dipegang + rusakHilang)
    return `Jumlah minimal ${dipegang + rusakHilang}: ${dipegang} sedang dipegang, ${rusakHilang} rusak/hilang.`;
  return null;
}
