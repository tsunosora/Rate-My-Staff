import { z } from "zod";
import { KATEGORI, parseJumlah } from "@/lib/services/reimbursement/aturan";

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD");

/** Jumlah Rupiah dari form ("15.000", "15000", 15000). Batas wajar diperiksa cekJumlah(). */
const rupiah = z
  .union([z.string(), z.number()])
  .transform((v, ctx) => {
    const n = parseJumlah(v);
    if (n === null) {
      ctx.addIssue({ code: "custom", message: "Jumlah tidak valid." });
      return z.NEVER;
    }
    return n;
  });

/** Klaim dari portal karyawan (medan teks multipart; foto diperiksa terpisah). */
export const klaimPortalSchema = z.object({
  tanggal: ymd,
  kategori: z.enum(KATEGORI, { message: "Pilih kategori." }),
  jumlah: rupiah,
  keterangan: z.string().trim().min(3, "Keterangan minimal 3 karakter").max(1000),
});

/** Klaim yang dicatat langsung oleh owner (sumber "admin", foto opsional). */
export const klaimAdminSchema = klaimPortalSchema.extend({
  employeeId: z.coerce.number().int().positive("Pilih karyawan."),
});

/** Keputusan owner atas satu klaim. */
export const keputusanSchema = z.object({
  aksi: z.enum(["setujui", "tolak", "bayar", "buka"]),
  jumlahDisetujui: rupiah.optional().nullable(),
  catatan: z.string().trim().max(1000).optional().nullable(),
});
