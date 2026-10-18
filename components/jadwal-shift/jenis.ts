/** Bentuk data halaman Jadwal Shift (jawaban GET /api/jadwal-shift) + pembantu tampilan. */

export type JadwalKerja = {
  id: number;
  name: string;
  startTime: string | null;
  endTime: string | null;
  isHoliday: boolean;
  flexibleHours: boolean;
  dihapus: boolean;
};

export type KaryawanKisi = {
  id: number;
  fullName: string;
  employeeCode: string;
  department: string | null;
  departmentId: number | null;
  workScheduleId: number | null;
};

export type SelRoster = {
  employeeId: number;
  tanggal: string;
  workScheduleId: number | null;
  libur: boolean;
  catatan: string | null;
};

export type TanggalKisi = { tanggal: string; hari: number; liburNasional: string | null; mingguLibur: boolean };

export type DataKisi = {
  dari: string;
  sampai: string;
  autoSunday: boolean;
  tanggal: TanggalKisi[];
  jadwal: JadwalKerja[];
  karyawan: KaryawanKisi[];
  sel: SelRoster[];
};

/** Pilihan untuk satu sel: jadwal kerja, libur, atau kembali ke jadwal tetap. */
export type Pilihan = { workScheduleId: number | null; libur: boolean };

export const NAMA_HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
export const NAMA_HARI_PANJANG = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const NAMA_BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function labelTanggal(ymd: string): string {
  const [, m, d] = ymd.split("-").map(Number);
  return `${d} ${NAMA_BULAN[m - 1]}`;
}

export function hariIni(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function jamJadwal(j: JadwalKerja | undefined | null): string {
  if (!j) return "";
  if (j.flexibleHours) return "jam bebas";
  if (j.isHoliday) return "libur";
  if (!j.startTime && !j.endTime) return "";
  return `${j.startTime ?? "?"}–${j.endTime ?? "?"}`;
}

/** Warna stabil per jadwal (urutan di daftar), supaya kisi mudah dibaca sekilas. */
const WARNA = ["var(--primary)", "var(--info)", "var(--success)", "#ec4899", "#14b8a6", "#f97316", "#a855f7", "#0ea5e9"];
export function warnaJadwal(jadwal: JadwalKerja[], id: number | null): string {
  if (id == null) return "var(--fg-subtle)";
  const i = jadwal.findIndex((j) => j.id === id);
  return WARNA[(i < 0 ? 0 : i) % WARNA.length];
}

export function inisial(nama: string): string {
  const kata = nama.trim().split(/\s+/);
  if (kata.length === 1) return kata[0].slice(0, 6);
  return kata.map((k) => k[0]).join("").slice(0, 3).toUpperCase();
}
