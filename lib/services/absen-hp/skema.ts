import { z } from "zod";

export const lokasiSchema = z.object({
  nama: z.string().trim().min(1).max(100),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  // Di bawah 30 m GPS HP sendiri sudah lebih lebar dari radiusnya; di atas 2 km bukan lagi "di toko".
  radiusM: z.coerce.number().int().min(30).max(2000),
  wajibQr: z.boolean().default(false),
});

export const ubahLokasiSchema = lokasiSchema.partial().extend({
  aktif: z.boolean().optional(),
  // Ganti alamat layar + rahasia QR: dipakai kalau alamat layarnya bocor ke luar toko.
  gantiLayar: z.boolean().optional(),
});

export const ubahKaryawanSchema = z.object({
  aktif: z.boolean().optional(),
  // Lepas kunci HP — dipakai kalau karyawan ganti HP. HP berikutnya yang absen jadi terkunci.
  lepasHp: z.boolean().optional(),
});

// Keputusan owner atas pengajuan absen di luar lokasi.
export const putusPengajuanSchema = z.object({
  aksi: z.enum(["setujui", "tolak"]),
  catatan: z.string().trim().max(1000).nullish(),
});

export const setelanAbsenHpSchema = z.object({
  luarLokasi: z.boolean(),
});
