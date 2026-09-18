import { z } from "zod";
import { LEAVE_TYPES } from "@/lib/services/leave/service";

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD");
const pin = z.string().min(1, "PIN wajib diisi").max(32);

/** Masuk ke portal karyawan dengan PIN. */
export const portalLoginSchema = z.object({ pin });

/** Buat PIN pertama kali (atau ganti PIN dari dalam portal). */
export const portalSetPinSchema = z
  .object({
    pin,
    confirm: pin,
    /** Wajib diisi saat mengganti PIN yang sudah ada. */
    currentPin: z.string().max(32).optional().nullable(),
  })
  .refine((v) => v.pin === v.confirm, {
    message: "Konfirmasi PIN tidak sama.",
    path: ["confirm"],
  });

/** Pengajuan izin dari portal karyawan atau form publik. */
export const leaveRequestSchema = z.object({
  type: z.enum(LEAVE_TYPES),
  startDate: ymd,
  /** Kosong = izin satu hari (disamakan dengan startDate). */
  endDate: ymd.optional().nullable(),
  reason: z.string().trim().min(3, "Alasan minimal 3 karakter").max(1000),
});

/** Pengajuan lewat form publik bertoken — perlu menyebut karyawannya. */
export const publicLeaveRequestSchema = leaveRequestSchema.extend({
  employeeId: z.coerce.number().int().positive(),
});

/** Keputusan owner/manajemen atas satu pengajuan. */
export const leaveDecisionSchema = z.object({
  action: z.enum(["approve", "reject", "cancel"]),
  note: z.string().trim().max(1000).optional().nullable(),
});

/** Admin menetapkan PIN portal karyawan; pin kosong = sistem membuatkan acak. */
export const adminPortalPinSchema = z.object({
  pin: z.string().max(32).optional().nullable(),
});
