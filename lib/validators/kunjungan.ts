import { z } from "zod";
import { HASIL } from "@/lib/services/kunjungan/aturan";

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD");
/** Kosong/null = NaN, supaya "" tidak diam-diam jadi koordinat 0 (z.coerce akan begitu). */
const angka = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? NaN : Number(v)),
  z.number({ error: "Lokasi HP tidak terbaca. Nyalakan GPS dan izinkan akses lokasi." }),
);
const teksOpsional = (maks: number) =>
  z
    .string()
    .trim()
    .max(maks, `Maksimal ${maks} huruf`)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

/** Mulai kunjungan dari portal (field multipart, foto dibaca terpisah). */
export const mulaiKunjunganSchema = z.object({
  namaKlien: z.string().max(200),
  alamat: teksOpsional(255),
  tujuan: teksOpsional(255),
  lat: angka,
  lng: angka,
  akurasi: angka,
});

/** Selesai kunjungan dari portal (JSON). */
export const selesaiKunjunganSchema = z.object({
  hasil: z.enum(HASIL, { error: "Pilih hasil kunjungan." }),
  catatan: teksOpsional(2000),
  lat: angka,
  lng: angka,
  akurasi: angka,
});

/** Saringan halaman owner & ekspor. */
export const saringKunjunganSchema = z
  .object({
    start: ymd,
    end: ymd,
    employeeId: z.coerce.number().int().positive().optional(),
    hasil: z.enum([...HASIL, "tanpa_hasil"]).optional(),
  })
  .refine((v) => v.end >= v.start, { message: "Tanggal akhir sebelum tanggal awal.", path: ["end"] });

export type SaringKunjungan = z.infer<typeof saringKunjunganSchema>;
