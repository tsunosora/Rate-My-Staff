import { z } from "zod";

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD");
const jam = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Jam harus berformat HH:MM");

/** Satu entri timesheet (dari portal karyawan). Aturan rentang & tumpang-tindih di aturan.ts. */
export const timesheetSchema = z.object({
  tanggal: ymd,
  mulai: jam,
  selesai: jam,
  /** Boleh kosong = pekerjaan di luar proyek. */
  proyek: z.string().trim().max(100, "Nama proyek maksimal 100 huruf").optional().nullable(),
  kegiatan: z.string().trim().min(2, "Tulis kegiatannya dulu").max(255, "Kegiatan maksimal 255 huruf"),
  catatan: z.string().trim().max(2000).optional().nullable(),
});

/** Dari dasbor owner: sebutkan karyawannya. */
export const timesheetAdminSchema = timesheetSchema.extend({
  employeeId: z.coerce.number().int().positive("Pilih karyawannya"),
});

export type TimesheetInput = z.infer<typeof timesheetSchema>;
