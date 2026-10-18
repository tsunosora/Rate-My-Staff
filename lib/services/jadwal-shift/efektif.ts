import type { PrismaClient } from "@prisma/client";
import { atMidnight, toYmd } from "@/lib/services/leave/service";
import {
  buatPetaJadwal,
  infoJadwal,
  type Bawaan,
  type BarisRoster,
  type PetaJadwal,
  type WorkScheduleLike,
} from "./aturan";

/**
 * Jadwal efektif per (karyawan, tanggal) untuk SEMUA perhitungan absensi (laporan, simpan status,
 * input manual, import, struk, portal). Satu sumber supaya tidak ada dua halaman yang menghitung
 * telat dengan jadwal berbeda.
 *
 * Baris JadwalShift menang atas `Employee.workScheduleId`; tanpa baris = jadwal tetap.
 * Tanggal di luar rentang yang dimuat ikut jatuh ke jadwal tetap — jadi pemanggil wajib memuat
 * rentang yang benar-benar dihitungnya.
 */
export async function jadwalEfektif(
  prisma: PrismaClient,
  employeeIds: number[],
  dariYmd: string,
  sampaiYmd: string
): Promise<PetaJadwal> {
  const ids = [...new Set(employeeIds)];
  if (ids.length === 0) return buatPetaJadwal(new Map(), []);

  const employees = await prisma.employee.findMany({ where: { id: { in: ids } }, select: { id: true, workSchedule: true } });
  return jadwalEfektifDari(prisma, employees, dariYmd, sampaiYmd);
}

export type KaryawanBawaan = { id: number; workSchedule: WorkScheduleLike | null };

/** Sama dengan jadwalEfektif, tapi jadwal tetap diambil dari karyawan yang SUDAH dimuat pemanggil. */
export async function jadwalEfektifDari(
  prisma: PrismaClient,
  employees: KaryawanBawaan[],
  dariYmd: string,
  sampaiYmd: string
): Promise<PetaJadwal> {
  const ids = [...new Set(employees.map((e) => e.id))];
  const roster = ids.length === 0 ? [] : await prisma.jadwalShift.findMany({
    where: { employeeId: { in: ids }, tanggal: { gte: atMidnight(dariYmd), lte: atMidnight(sampaiYmd) } },
    include: { workSchedule: true },
  });

  const bawaan = new Map<number, Bawaan>(
    employees.map((e) => [e.id, { id: e.workSchedule?.id ?? null, schedule: infoJadwal(e.workSchedule) }])
  );
  const baris: BarisRoster[] = roster.map((r) => ({
    employeeId: r.employeeId,
    tanggal: toYmd(r.tanggal),
    workScheduleId: r.workScheduleId,
    libur: r.libur,
    catatan: r.catatan,
    workSchedule: r.workSchedule,
  }));
  return buatPetaJadwal(bawaan, baris);
}
