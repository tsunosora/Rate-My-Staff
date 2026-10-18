import { fiturTampil } from "@/lib/lisensi/penjaga";
import { rapikanNama } from "./aturan";

/**
 * Kolom upah tukang & tim di form karyawan (Direktori). Rute karyawan sendiri milik hr.employees,
 * jadi kolom yang butuh fitur LAIN disaring di sini: paket tanpa hr.upah tidak bisa menulis tarif
 * per karyawan lewat jalan memutar, dan paket tanpa hr.absen_hp tidak bisa mengatur tim.
 * Gagal-terbuka seperti penegak lisensi lainnya (tanpa kunci = semua boleh).
 */
export type MasukanLapangan = {
  upahHarian?: number | null;
  upahLemburPerJam?: number | null;
  kotaBawaan?: string | null;
  divisiBawaan?: string | null;
  timId?: number | null;
};

export async function dataLapangan(d: MasukanLapangan) {
  const f = await fiturTampil(["hr.upah", "hr.absen_hp"]);
  return {
    ...(f["hr.upah"] && d.upahHarian !== undefined && { upahHarian: d.upahHarian ?? null }),
    ...(f["hr.upah"] && d.upahLemburPerJam !== undefined && { upahLemburPerJam: d.upahLemburPerJam ?? null }),
    ...(f["hr.absen_hp"] && d.kotaBawaan !== undefined && { kotaBawaan: rapikanNama(d.kotaBawaan) || null }),
    ...(f["hr.absen_hp"] && d.divisiBawaan !== undefined && { divisiBawaan: rapikanNama(d.divisiBawaan) || null }),
    ...(f["hr.absen_hp"] && d.timId !== undefined && { timId: d.timId || null }),
  };
}
