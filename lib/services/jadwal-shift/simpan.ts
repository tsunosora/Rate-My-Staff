import type { PrismaClient } from "@prisma/client";
import { atMidnight } from "@/lib/services/leave/service";
import { recomputeStoredStatus } from "@/lib/services/attendance/recompute";
import { pisahSimpan, tanggalTerawal, type SelSimpan } from "./aturan";

export type HasilSimpan = { disimpan: number; dihapus: number; dihitungUlang: number };

/**
 * Terapkan sel roster: upsert yang berisi, hapus yang kembali ke bawaan, lalu hitung ulang status
 * absensi TERSIMPAN untuk karyawan & tanggal yang berubah (Log Absensi membaca kolom tersimpan).
 *
 * Melempar Error berpesan bila karyawan/jadwal tidak dikenal — pemanggil mengubahnya jadi 422.
 */
export async function terapkanSel(
  prisma: PrismaClient,
  sel: SelSimpan[],
  createdById: number | null
): Promise<HasilSimpan> {
  if (sel.length === 0) return { disimpan: 0, dihapus: 0, dihitungUlang: 0 };
  const { simpan, hapus } = pisahSimpan(sel);

  const empIds = [...new Set(sel.map((s) => s.employeeId))];
  const wsIds = [...new Set(simpan.map((s) => s.workScheduleId).filter((x): x is number => x != null))];
  const [emps, wss] = await Promise.all([
    prisma.employee.findMany({ where: { id: { in: empIds }, deletedAt: null }, select: { id: true } }),
    wsIds.length
      ? prisma.workSchedule.findMany({ where: { id: { in: wsIds }, deletedAt: null }, select: { id: true } })
      : Promise.resolve([]),
  ]);
  if (emps.length !== empIds.length) throw new GalatJadwal("Ada karyawan yang tidak ditemukan.");
  if (wss.length !== wsIds.length) throw new GalatJadwal("Ada jadwal kerja yang tidak ditemukan atau sudah dihapus.");

  await prisma.$transaction(
    async (tx) => {
      for (const s of simpan) {
        const data = { workScheduleId: s.workScheduleId, libur: s.libur, catatan: s.catatan ?? null };
        await tx.jadwalShift.upsert({
          where: { employeeId_tanggal: { employeeId: s.employeeId, tanggal: atMidnight(s.tanggal) } },
          create: { employeeId: s.employeeId, tanggal: atMidnight(s.tanggal), createdById, ...data },
          update: data,
        });
      }
      // Hapus per karyawan sekaligus supaya sel "kembali ke bawaan" dalam jumlah besar tetap ringan.
      const perKaryawan = new Map<number, Date[]>();
      for (const h of hapus) {
        const arr = perKaryawan.get(h.employeeId) ?? [];
        arr.push(atMidnight(h.tanggal));
        perKaryawan.set(h.employeeId, arr);
      }
      for (const [employeeId, tanggal] of perKaryawan) {
        await tx.jadwalShift.deleteMany({ where: { employeeId, tanggal: { in: tanggal } } });
      }
    },
    { timeout: 60_000 }
  );

  const awal = tanggalTerawal(sel);
  const dihitungUlang = awal
    ? await recomputeStoredStatus(prisma, { employeeIds: empIds, from: atMidnight(awal) })
    : 0;
  return { disimpan: simpan.length, dihapus: hapus.length, dihitungUlang };
}

export class GalatJadwal extends Error {}
