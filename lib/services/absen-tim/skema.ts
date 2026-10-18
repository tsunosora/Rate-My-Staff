import { z } from "zod";

// PIC membuka (atau membuka lagi) sesi di satu tempat kerja.
export const mulaiSesiSchema = z.object({
  namaTempat: z.string().max(300),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  akurasi: z.coerce.number(),
});

// PIC mendaftarkan tukang freelance di tempat. Pembersihan & aturan dobel ada di aturan.ts.
export const freelanceSchema = z.object({
  nama: z.string().max(300),
  hp: z.string().max(40).nullish(),
  tetapDaftarkan: z.boolean().default(false),
});

// Keputusan owner/HR atas satu baris absen tim.
export const putusBarisSchema = z.object({
  aksi: z.enum(["setujui", "tolak"]),
  catatan: z.string().trim().max(1000).nullish(),
});

// "Setujui semua yang menunggu" di satu sesi.
export const setujuiSesiSchema = z.object({
  catatan: z.string().trim().max(1000).nullish(),
});

// Freelance baru: sudah diperiksa owner/HR, atau nonaktifkan (tukang fiktif / tidak kerja lagi).
export const periksaFreelanceSchema = z.object({
  aksi: z.enum(["periksa", "nonaktifkan"]),
});
