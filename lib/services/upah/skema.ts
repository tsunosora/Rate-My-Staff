import { z } from "zod";
import { JENIS_PENYESUAIAN } from "./hitung";
import { STATUS_REKAP } from "./aturan";

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak dikenal.");
const teks = (maks: number) => z.string().max(maks).nullish();
const lembur = z.coerce.number().min(0, "Lembur tidak boleh minus.").max(24, "Lembur paling lama 24 jam.");
const rupiah = z.coerce.number().min(0, "Jumlah tidak boleh minus.").max(1_000_000_000, "Jumlah terlalu besar.");
/** updatedAt baris saat dimuat — perubahan PIC sesudahnya menolak aksi ini (bukan ditimpa diam-diam). */
const versi = z.string().min(1);

// Isi baris yang boleh diubah admin (persetujuan). sumber tidak ikut.
const isiBaris = {
  status: z.enum(STATUS_REKAP),
  lemburJam: lembur,
  kota: teks(100),
  divisi: teks(100),
  proyekId: z.coerce.number().int().positive().nullish(),
  catatan: teks(255),
};

export const putusRekapSchema = z.discriminatedUnion("aksi", [
  z.object({ aksi: z.literal("setujui"), versi }),
  z.object({ aksi: z.literal("tolak"), versi, alasan: z.string().max(1000) }),
  z.object({ aksi: z.literal("ubah"), versi, ...isiBaris }),
]);

export const tambahRekapSchema = z.object({
  employeeId: z.coerce.number().int().positive(),
  tanggal: ymd,
  ...isiBaris,
});

export const setujuiMassalSchema = z.object({
  dari: ymd,
  sampai: ymd,
  timId: z.union([z.coerce.number().int().positive(), z.literal("tanpa")]).nullish(),
  employeeId: z.coerce.number().int().positive().nullish(),
  /** Waktu daftar dimuat: baris yang diubah PIC sesudahnya tidak ikut disetujui. */
  dimuatAt: z.string().min(1),
});

export const penyesuaianSchema = z.object({
  employeeId: z.coerce.number().int().positive(),
  tanggal: ymd,
  jenis: z.enum(JENIS_PENYESUAIAN as unknown as [string, ...string[]]),
  jumlah: rupiah.refine((n) => n > 0, "Jumlah harus lebih dari 0."),
  catatan: teks(255),
});

export const upahKhususSchema = z.object({
  upahKhusus: rupiah.nullish(),
  upahKhususCatatan: teks(255),
});

export const bayarSchema = z.object({
  dari: ymd,
  sampai: ymd,
  /** Jumlah yang ditampilkan di konfirmasi. Beda dengan hitungan server = ada yang berubah → tolak. */
  jumlahDilihat: z.coerce.number(),
  catatan: teks(255),
});
