import { z } from "zod";

export const rewardSchema = z.object({
  name: z.string().trim().min(1, "Nama hadiah wajib diisi").max(150),
  description: z.string().trim().max(1000).optional().nullable(),
  type: z.enum(["cash", "product", "voucher"]),
  pointCost: z.coerce.number().int().positive("Harga poin harus lebih dari 0"),
  /** Nilai rupiah — wajib untuk hadiah uang, informasi saja untuk jenis lain. */
  cashValue: z.coerce.number().nonnegative().optional().nullable(),
  /** Kosong = stok tak dibatasi. */
  stock: z.coerce.number().int().nonnegative().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const rewardUpdateSchema = rewardSchema.partial();

/** Karyawan mengajukan penukaran dari portalnya. */
export const redemptionCreateSchema = z.object({
  rewardId: z.coerce.number().int().positive(),
  note: z.string().trim().max(500).optional().nullable(),
});

/** Keputusan owner atas pengajuan penukaran. */
export const redemptionDecisionSchema = z.object({
  action: z.enum(["approve", "reject", "deliver", "cancel"]),
  note: z.string().trim().max(500).optional().nullable(),
});
