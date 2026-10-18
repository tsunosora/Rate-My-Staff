import { z } from "zod";

export const employeeCreateSchema = z.object({
  fullName: z.string().min(1).max(150),
  nickname: z.string().max(50).optional().nullable(),
  machinePin: z.string().max(50).optional().nullable(),
  departmentId: z.coerce.number().int().positive().optional().nullable(),
  positionId: z.coerce.number().int().positive().optional().nullable(),
  workScheduleId: z.coerce.number().int().positive().optional().nullable(),
  joinDate: z.string().optional().nullable(),
  salary: z.coerce.number().nonnegative().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().max(30).optional().nullable(),
  /** Pemetaan ke akun PosPro (User.id di sana); null = tidak dipetakan. */
  posproUserId: z.coerce.number().int().positive().optional().nullable(),
  // Upah tukang (hr.upah). Null = belum diatur; tarif proyek / kota×divisi didahulukan.
  upahHarian: z.coerce.number().nonnegative("Upah harian tidak boleh minus.").max(10_000_000, "Upah harian terlalu besar.").optional().nullable(),
  upahLemburPerJam: z.coerce.number().nonnegative("Lembur per jam tidak boleh minus.").max(10_000_000, "Lembur per jam terlalu besar.").optional().nullable(),
  kotaBawaan: z.string().max(100).optional().nullable(),
  divisiBawaan: z.string().max(100).optional().nullable(),
  // Tim kerja (hr.absen_hp) — anggota tim PIC lapangan. Kota/divisi bawaan juga hr.absen_hp.
  timId: z.coerce.number().int().positive().optional().nullable(),
});

/** Kolom yang butuh fitur lisensi tertentu — diabaikan diam-diam kalau paketnya tidak memuatnya. */
// Rupiah = hr.upah; kota/divisi bawaan & tim = hr.absen_hp (rekap kehadiran tanpa rupiah).
export const KOLOM_UPAH = ["upahHarian", "upahLemburPerJam"] as const;
export const KOLOM_LAPANGAN = ["kotaBawaan", "divisiBawaan", "timId"] as const;

export const employeeUpdateSchema = employeeCreateSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type EmployeeCreateInput = z.infer<typeof employeeCreateSchema>;
export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;
