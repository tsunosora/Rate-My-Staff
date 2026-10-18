import { z } from "zod";
import { MAKS_MENIT } from "@/lib/services/lembur/aturan";

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD");
const jam = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "Format jam harus HH:MM")
  .optional()
  .nullable()
  .or(z.literal(""));

/**
 * Pengajuan lembur dari portal karyawan. Isi jam mulai–selesai ATAU jumlah menit; aturan
 * lengkapnya (rentang lewat tengah malam, batas tanggal) di lib/services/lembur/aturan.ts.
 */
export const lemburSchema = z.object({
  tanggal: ymd,
  mulai: jam,
  selesai: jam,
  menit: z.coerce.number().int().min(1).max(MAKS_MENIT).optional().nullable(),
  alasan: z.string().trim().min(3, "Alasan minimal 3 karakter").max(1000),
});

/** Lewat form tautan publik — perlu menyebut karyawannya. */
export const lemburPublikSchema = lemburSchema.extend({
  employeeId: z.coerce.number().int().positive(),
});

/** Owner/HR mencatat langsung; `setujui` = langsung disetujui (bawaan) tanpa antre. */
export const lemburAdminSchema = lemburSchema.extend({
  employeeId: z.coerce.number().int().positive(),
  setujui: z.boolean().optional(),
});

/**
 * Keputusan owner.
 * - approve : `menitDisetujui` opsional (kosong = sama dengan yang diajukan)
 * - reapply : tulis ulang menit yang disetujui ke baris pulang (mis. scan pulang baru masuk)
 */
export const lemburKeputusanSchema = z.object({
  action: z.enum(["approve", "reject", "cancel", "reapply"]),
  menitDisetujui: z.coerce.number().int().min(1).max(MAKS_MENIT).optional().nullable(),
  note: z.string().trim().max(1000).optional().nullable(),
});
