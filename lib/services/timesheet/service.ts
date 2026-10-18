/**
 * Bagian timesheet yang menyentuh database. Keputusannya tetap di aturan.ts (murni);
 * berkas ini cuma mengambil data lalu menyerahkannya ke sana, supaya portal karyawan dan
 * dasbor owner memakai satu jalur penyimpanan yang sama.
 */
import type { PrismaClient, TimesheetEntri } from "@prisma/client";
import { aggregateAttendance } from "@/lib/services/attendance/aggregate";
import { atMidnight, toYmd } from "@/lib/services/leave/service";
import {
  cariTumpangTindih,
  rapikanRentang,
  geserTanggal,
  menitHadir,
  periksaRentangJam,
  periksaTanggal,
  rapikanProyek,
  saranProyek,
  persenTercatat,
  rekapPerKaryawan,
  rekapPerProyek,
  type HadirRekap,
} from "./aturan";
import type { TimesheetInput } from "@/lib/validators/timesheet";

export type SumberTimesheet = "portal" | "admin";

export function serializeEntri(e: TimesheetEntri) {
  return {
    id: e.id,
    employeeId: e.employeeId,
    tanggal: toYmd(e.tanggal),
    mulai: e.mulai,
    selesai: e.selesai,
    menit: e.menit,
    proyek: e.proyek,
    kegiatan: e.kegiatan,
    catatan: e.catatan,
    sumber: e.sumber,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

export type EntriJson = ReturnType<typeof serializeEntri>;

/** Batas `where.tanggal` untuk rentang inklusif. */
export function whereRentang(dari: string, sampai: string) {
  return { gte: atMidnight(dari), lt: atMidnight(geserTanggal(sampai, 1)) };
}

export type HasilSimpan =
  | { ok: true; entri: TimesheetEntri }
  | { ok: false; status: 409 | 422; message: string };

/**
 * Buat (tanpa `id`) atau ubah (dengan `id`) satu entri. Memeriksa tanggal, rentang jam, dan
 * tumpang-tindih dengan entri lain milik karyawan itu di tanggal yang sama.
 * `tanpaBatasMundur` hanya untuk owner (merapikan catatan lebih dari 14 hari).
 */
export async function simpanEntri(
  prisma: PrismaClient,
  args: {
    employeeId: number;
    input: TimesheetInput;
    id?: number;
    sumber: SumberTimesheet;
    tanpaBatasMundur?: boolean;
    hariIni?: string;
  }
): Promise<HasilSimpan> {
  const { employeeId, input, id } = args;
  const hariIni = args.hariIni ?? toYmd(new Date());

  const cekTanggal = periksaTanggal(input.tanggal, hariIni, { tanpaBatasMundur: args.tanpaBatasMundur });
  if (!cekTanggal.ok) return { ok: false, status: 422, message: cekTanggal.error };
  const cekJam = periksaRentangJam(input.mulai, input.selesai);
  if (!cekJam.ok) return { ok: false, status: 422, message: cekJam.error };

  const lain = await prisma.timesheetEntri.findMany({
    where: { employeeId, tanggal: whereRentang(input.tanggal, input.tanggal) },
    select: { id: true, mulai: true, selesai: true, kegiatan: true },
  });
  const bentrok = cariTumpangTindih({ mulai: input.mulai, selesai: input.selesai }, lain, id);
  if (bentrok) {
    return {
      ok: false,
      status: 409,
      message: `Bertumpang-tindih dengan catatan ${bentrok.mulai}–${bentrok.selesai} (${bentrok.kegiatan}).`,
    };
  }

  const data = {
    tanggal: atMidnight(input.tanggal),
    mulai: input.mulai,
    selesai: input.selesai,
    menit: cekJam.menit,
    proyek: rapikanProyek(input.proyek),
    kegiatan: input.kegiatan.trim(),
    catatan: input.catatan?.trim() ? input.catatan.trim() : null,
  };

  const entri = id
    ? await prisma.timesheetEntri.update({ where: { id }, data })
    : await prisma.timesheetEntri.create({ data: { ...data, employeeId, sumber: args.sumber } });
  return { ok: true, entri };
}

/** Saran proyek dari entri 120 hari terakhir di usaha ini (semua karyawan). */
export async function saranProyekUsaha(prisma: PrismaClient): Promise<string[]> {
  const sejak = atMidnight(geserTanggal(toYmd(new Date()), -120));
  const rows = await prisma.timesheetEntri.findMany({
    where: { tanggal: { gte: sejak }, proyek: { not: "" } },
    select: { proyek: true, tanggal: true },
    orderBy: { tanggal: "desc" },
    take: 2000,
  });
  return saranProyek(rows.map((r) => ({ proyek: r.proyek, tanggal: toYmd(r.tanggal) })));
}

export type HadirHari = HadirRekap & { jamMasuk: string | null; jamPulang: string | null };

/**
 * Jam hadir per karyawan per hari dari absensi (pasangan scan masuk–pulang), memakai
 * agregasi laporan absensi yang sama. Hari ini yang baru punya scan masuk dihitung sampai
 * sekarang.
 */
export async function hadirPerHari(
  prisma: PrismaClient,
  args: { dari: string; sampai: string; employeeId?: number | null }
): Promise<HadirHari[]> {
  const res = await aggregateAttendance(prisma, {
    startStr: args.dari,
    endStr: args.sampai,
    employeeId: args.employeeId ? String(args.employeeId) : null,
  });
  const sekarang = new Date();
  const hariIni = toYmd(sekarang);
  const menitSekarang = sekarang.getHours() * 60 + sekarang.getMinutes();
  return res.rows.map((r) => ({
    employeeId: r.employeeId,
    tanggal: r.date,
    jamMasuk: r.clockIn,
    jamPulang: r.clockOut,
    menit: menitHadir(r.clockIn, r.clockOut, { hariIni: r.date === hariIni, menitSekarang }),
  }));
}

export type FilterAdmin = {
  dari: string;
  sampai: string;
  employeeId: number | null;
  /** null = semua; "" = hanya entri tanpa proyek. */
  proyek: string | null;
};

/** Saringan daftar/rekap/ekspor owner dari query string. Bawaan: 30 hari terakhir. */
export function filterAdminDari(sp: URLSearchParams): FilterAdmin {
  const hariIni = toYmd(new Date());
  const { dari, sampai } = rapikanRentang(sp.get("dari"), sp.get("sampai"), {
    dari: geserTanggal(hariIni, -29),
    sampai: hariIni,
  });
  const emp = Number(sp.get("employee_id"));
  const proyekParam = sp.get("proyek");
  return {
    dari,
    sampai,
    employeeId: Number.isInteger(emp) && emp > 0 ? emp : null,
    proyek: sp.get("tanpa_proyek") === "1" ? "" : proyekParam ? rapikanProyek(proyekParam) : null,
  };
}

/** `where` Prisma dari saringan owner. MySQL membandingkan proyek tanpa peduli huruf besar-kecil. */
export function whereAdmin(f: FilterAdmin, { denganProyek = true } = {}) {
  return {
    tanggal: whereRentang(f.dari, f.sampai),
    ...(f.employeeId ? { employeeId: f.employeeId } : {}),
    ...(denganProyek && f.proyek !== null ? { proyek: f.proyek } : {}),
  };
}

/** Karyawan aktif untuk pilihan di dasbor (tanpa bergantung pada API fitur lain). */
export async function daftarKaryawan(prisma: PrismaClient) {
  const rows = await prisma.employee.findMany({
    where: { deletedAt: null, isActive: true },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, employeeCode: true, department: { select: { name: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    nama: r.fullName,
    kode: r.employeeCode,
    departemen: r.department?.name ?? null,
  }));
}

/**
 * Rekap untuk dasbor & ekspor. Perbandingan dengan jam hadir memakai SEMUA entri karyawan
 * (saringan proyek tidak ikut) — membandingkan jam satu proyek dengan jam hadir sehari
 * penuh akan selalu terbaca "kurang tercatat". Rekap per proyek mengikuti saringan proyek.
 */
export async function bangunRekap(prisma: PrismaClient, f: FilterAdmin) {
  const [semua, hadir, karyawan] = await Promise.all([
    prisma.timesheetEntri.findMany({
      where: whereAdmin(f, { denganProyek: false }),
      select: { employeeId: true, tanggal: true, menit: true, proyek: true },
    }),
    hadirPerHari(prisma, { dari: f.dari, sampai: f.sampai, employeeId: f.employeeId }),
    prisma.employee.findMany({
      select: { id: true, fullName: true, employeeCode: true, department: { select: { name: true } } },
    }),
  ]);
  const nama = new Map(karyawan.map((k) => [k.id, k]));
  const entri = semua.map((e) => ({ ...e, tanggal: toYmd(e.tanggal) }));
  const proyekKunci = f.proyek === null ? null : f.proyek.toLowerCase();
  const entriProyek =
    proyekKunci === null ? entri : entri.filter((e) => rapikanProyek(e.proyek).toLowerCase() === proyekKunci);

  const label = (id: number) => {
    const k = nama.get(id);
    return { nama: k?.fullName ?? `#${id}`, kode: k?.employeeCode ?? "", departemen: k?.department?.name ?? null };
  };

  const perKaryawan = rekapPerKaryawan(entri, hadir)
    .map((r) => ({ ...r, ...label(r.employeeId) }))
    .sort((a, b) => a.nama.localeCompare(b.nama));
  const perProyek = rekapPerProyek(entriProyek).map((p) => ({
    ...p,
    karyawan: p.karyawan.map((k) => ({ ...k, nama: label(k.employeeId).nama })),
  }));

  const totalTercatat = perKaryawan.reduce((s, r) => s + r.tercatat, 0);
  const totalHadir = perKaryawan.reduce((s, r) => s + r.hadir, 0);
  return {
    filter: f,
    perKaryawan,
    perProyek,
    total: { tercatat: totalTercatat, hadir: totalHadir, persen: persenTercatat(totalTercatat, totalHadir) },
  };
}

export type Rekap = Awaited<ReturnType<typeof bangunRekap>>;
