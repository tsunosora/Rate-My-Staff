import { z } from "zod";
import { NAMA_TIM_MAKS } from "@/lib/services/tim-kerja/aturan";

const nama = z.string().trim().min(1, "Nama tim wajib diisi.").max(NAMA_TIM_MAKS);

// Tanpa nilai bawaan: di zod 4 `.default()` tetap terisi di dalam `.partial()`, jadi PATCH tanpa
// `aktif` akan diam-diam menyalakan kembali tim yang dinonaktifkan.
const timDasar = z.object({
  nama,
  warna: z.string().max(9),
  picId: z.number().int().positive().nullable(),
  aktif: z.boolean(),
  catatan: z.string().max(1000).nullable(),
});

export const timBaruSchema = timDasar.partial().extend({ nama });
export const timUbahSchema = timDasar.partial();

export const anggotaSchema = z.object({ employeeId: z.number().int().positive() });
