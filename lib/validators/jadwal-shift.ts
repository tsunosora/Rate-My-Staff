import { z } from "zod";
import { MAKS_SEL_SIMPAN } from "@/lib/services/jadwal-shift/aturan";

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD");
const idOrNull = z.number().int().positive().nullable();

/** Satu sel kisi. `workScheduleId:null & libur:false` = kembali ke jadwal tetap (barisnya dihapus). */
export const selJadwalSchema = z.object({
  employeeId: z.number().int().positive(),
  tanggal: ymd,
  workScheduleId: idOrNull,
  libur: z.boolean().default(false),
  catatan: z.string().max(255).nullable().optional(),
});

const langkahSchema = z.object({ workScheduleId: idOrNull, libur: z.boolean().default(false) });

/** PUT: simpan sel satu per satu ATAU isi massal dengan pola. */
export const simpanJadwalSchema = z.union([
  z.object({ sel: z.array(selJadwalSchema).min(1).max(MAKS_SEL_SIMPAN) }),
  z.object({
    massal: z.object({
      employeeIds: z.array(z.number().int().positive()).min(1).max(500),
      dari: ymd,
      sampai: ymd,
      pola: z.array(langkahSchema).min(1).max(31),
      hari: z.array(z.number().int().min(0).max(6)).max(7).nullable().optional(),
    }),
  }),
]);

/** POST /salin: salin rentang sumber ke rentang tujuan sepanjang sama. */
export const salinJadwalSchema = z.object({
  dariSumber: ymd,
  sampaiSumber: ymd,
  dariTujuan: ymd,
  employeeIds: z.array(z.number().int().positive()).min(1).max(500).optional(),
  departmentId: z.number().int().positive().nullable().optional(),
  timpa: z.boolean().default(true),
});

export type SelJadwal = z.infer<typeof selJadwalSchema>;
