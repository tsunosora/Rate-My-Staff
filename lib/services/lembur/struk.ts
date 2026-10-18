import type { PrismaClient } from "@prisma/client";
import { toYmd } from "@/lib/services/leave/service";
import { menitLemburStruk } from "./aturan";

/**
 * Menit lembur dari PENGAJUAN LEMBUR yang DISETUJUI, per tanggal ("YYYY-MM-DD"), untuk satu
 * karyawan dalam rentang. Dipakai struk (lib/services/attendance/receipt-source.ts).
 *
 * Sengaja dibaca dari PengajuanLembur, BUKAN dari `Attendance.approvedOvertimeMinutes`: kolom
 * itu sudah lama bisa diisi tangan di edit absensi dan selama ini TIDAK PERNAH dibaca struk.
 * Membacanya mentah akan mengubah struk lama yang sudah dibayar tanpa ada yang memutuskan.
 * Dengan begini struk cuma berubah untuk hari yang memang punya pengajuan yang disetujui —
 * termasuk hari yang scan pulangnya belum ada.
 */
export async function menitLemburDisetujuiPerTanggal(
  prisma: PrismaClient,
  employeeId: number,
  startStr: string,
  endStr: string
): Promise<Map<string, number>> {
  const pengajuan = await prisma.pengajuanLembur.findMany({
    where: {
      employeeId,
      status: "approved",
      tanggal: { gte: new Date(`${startStr}T00:00:00`), lte: new Date(`${endStr}T23:59:59`) },
    },
    select: { tanggal: true, menit: true, menitDisetujui: true },
  });
  const hasil = new Map<string, number>();
  for (const p of pengajuan) {
    const m = p.menitDisetujui ?? p.menit;
    if (m > 0) hasil.set(toYmd(p.tanggal), m);
  }
  return hasil;
}

/**
 * Menit lembur di struk untuk satu hari: maks(jam scan, disetujui). Tidak dijumlah — lembur yang
 * sudah terhitung otomatis dari jam scan tidak boleh terbayar dua kali.
 */
export function gabungMenitStruk(dariScan: number, disetujui: number | undefined): number {
  return menitLemburStruk(dariScan, disetujui ?? 0);
}
