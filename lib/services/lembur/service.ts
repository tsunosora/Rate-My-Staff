import type { PrismaClient, PengajuanLembur } from "@prisma/client";
import { atMidnight, toYmd } from "@/lib/services/leave/service";
import { notifyManagers } from "@/lib/notify";
import {
  cariBentrok,
  cekTanggalLembur,
  keputusanTarik,
  pilihBarisPulang,
  statusPenerapan,
  teksDurasi,
  tentukanDurasi,
  type InputDurasi,
  type StatusPenerapan,
} from "./aturan";
import { hitungNominalLembur } from "./nominal";

export type SumberLembur = "portal" | "link" | "admin";

/** Rentang satu tanggal lokal [00:00, 00:00 besok). */
function rentangHari(tanggal: string): { gte: Date; lt: Date } {
  const gte = atMidnight(tanggal);
  return { gte, lt: new Date(gte.getTime() + 86400000) };
}

/** Baris scan pulang (paling akhir) karyawan di tanggal itu, atau null. */
export async function cariBarisPulang(prisma: PrismaClient, employeeId: number, tanggal: string) {
  const baris = await prisma.attendance.findMany({
    where: { employeeId, scanDate: rentangHari(tanggal), scanType: "out" },
    select: {
      id: true,
      scanDate: true,
      scanType: true,
      approvedOvertimeMinutes: true,
      overtimeCategoryId: true,
    },
  });
  return pilihBarisPulang(baris);
}

export type HasilTerapkan =
  | { status: "diterapkan"; attendanceId: number; nilaiLama: number }
  | { status: "belum_ada_scan_pulang" };

/**
 * Tulis menit yang disetujui ke `approvedOvertimeMinutes` baris scan pulang + hitung ulang
 * nominalnya (cara yang sama dengan edit absensi manual). Tidak ada scan pulang = tidak menulis
 * apa pun; baris absensi palsu TIDAK pernah dibuat.
 */
export async function terapkanLembur(
  prisma: PrismaClient,
  p: { employeeId: number; tanggal: string; menit: number }
): Promise<HasilTerapkan> {
  const pulang = await cariBarisPulang(prisma, p.employeeId, p.tanggal);
  if (!pulang) return { status: "belum_ada_scan_pulang" };
  const data: { approvedOvertimeMinutes: number; overtimeAmount?: number } = {
    approvedOvertimeMinutes: p.menit,
  };
  const nominal = await hitungNominalLembur(prisma, pulang.overtimeCategoryId, p.menit);
  if (nominal !== null) data.overtimeAmount = nominal;
  await prisma.attendance.update({ where: { id: pulang.id }, data });
  return { status: "diterapkan", attendanceId: pulang.id, nilaiLama: pulang.approvedOvertimeMinutes };
}

export type HasilTarik =
  | { status: "dikembalikan" }
  | { status: "dibiarkan"; nilaiSekarang: number }
  | { status: "tidak_ada_baris" };

/** Tarik menit persetujuan dari baris pulang — hanya kalau nilainya belum diubah manual. */
export async function tarikLembur(
  prisma: PrismaClient,
  p: { employeeId: number; tanggal: string; menit: number }
): Promise<HasilTarik> {
  const pulang = await cariBarisPulang(prisma, p.employeeId, p.tanggal);
  if (!pulang) return { status: "tidak_ada_baris" };
  const k = keputusanTarik(pulang.approvedOvertimeMinutes, p.menit);
  if (!k.ubah) return { status: "dibiarkan", nilaiSekarang: k.nilaiSekarang };
  const data: { approvedOvertimeMinutes: number; overtimeAmount?: number } = {
    approvedOvertimeMinutes: k.nilai,
  };
  const nominal = await hitungNominalLembur(prisma, pulang.overtimeCategoryId, k.nilai);
  if (nominal !== null) data.overtimeAmount = nominal;
  await prisma.attendance.update({ where: { id: pulang.id }, data });
  return { status: "dikembalikan" };
}

/** Keadaan penerapan untuk banyak pengajuan disetujui sekaligus (daftar di dasbor). */
export async function statusPenerapanBanyak(
  prisma: PrismaClient,
  daftar: Pick<PengajuanLembur, "id" | "employeeId" | "tanggal" | "menitDisetujui" | "menit">[]
): Promise<Map<number, StatusPenerapan>> {
  const hasil = new Map<number, StatusPenerapan>();
  if (daftar.length === 0) return hasil;
  const ids = [...new Set(daftar.map((d) => d.employeeId))];
  const min = new Date(Math.min(...daftar.map((d) => d.tanggal.getTime())));
  const max = new Date(Math.max(...daftar.map((d) => d.tanggal.getTime())) + 86400000);
  const baris = await prisma.attendance.findMany({
    where: { employeeId: { in: ids }, scanType: "out", scanDate: { gte: min, lt: max } },
    select: { id: true, employeeId: true, scanDate: true, scanType: true, approvedOvertimeMinutes: true },
  });
  const perKunci = new Map<string, typeof baris>();
  for (const b of baris) {
    const k = `${b.employeeId}|${toYmd(b.scanDate)}`;
    const arr = perKunci.get(k) ?? [];
    arr.push(b);
    perKunci.set(k, arr);
  }
  for (const d of daftar) {
    const pulang = pilihBarisPulang(perKunci.get(`${d.employeeId}|${toYmd(d.tanggal)}`) ?? []);
    hasil.set(d.id, statusPenerapan(pulang?.approvedOvertimeMinutes ?? null, d.menitDisetujui ?? d.menit));
  }
  return hasil;
}

export function lemburNotificationData(input: {
  pengajuanId: number;
  employeeId: number;
  employeeName: string;
  tanggal: string;
  menit: number;
}) {
  return {
    title: "Pengajuan lembur baru",
    message: `${input.employeeName} — ${teksDurasi(input.menit)}, ${input.tanggal}`,
    pengajuanLemburId: input.pengajuanId,
    employeeId: input.employeeId,
    tanggal: input.tanggal,
    menit: input.menit,
  };
}

export type InputPengajuan = InputDurasi & { tanggal: string; alasan: string };

export type HasilBuat =
  | { ok: true; pengajuan: PengajuanLembur }
  | { ok: false; status: 409 | 422; field?: string; message: string };

/**
 * Satu jalan untuk ketiga pintu (portal, tautan, admin): cek tanggal, hitung menit, tolak
 * bentrok, simpan, kabari owner (kecuali owner sendiri yang mencatat).
 */
export async function buatPengajuan(
  prisma: PrismaClient,
  p: {
    employee: { id: number; fullName: string };
    input: InputPengajuan;
    sumber: SumberLembur;
    maksMundur: number;
    hariIni?: string;
  }
): Promise<HasilBuat> {
  const hariIni = p.hariIni ?? toYmd(new Date());
  const tgl = cekTanggalLembur(p.input.tanggal, hariIni, p.maksMundur);
  if (!tgl.ok) return { ok: false, status: 422, field: "tanggal", message: tgl.error };
  const dur = tentukanDurasi(p.input);
  if (!dur.ok) return { ok: false, status: 422, field: "menit", message: dur.error };

  const { gte, lt } = rentangHari(p.input.tanggal);
  const aktif = await prisma.pengajuanLembur.findMany({
    where: { employeeId: p.employee.id, tanggal: { gte, lt }, status: { in: ["pending", "approved"] } },
    select: { id: true, tanggal: true, status: true },
  });
  const bentrok = cariBentrok(
    aktif.map((a) => ({ id: a.id, tanggal: toYmd(a.tanggal), status: a.status })),
    p.input.tanggal
  );
  if (bentrok) {
    const kata = bentrok.status === "approved" ? "sudah disetujui" : "masih menunggu";
    return {
      ok: false,
      status: 409,
      message: `Sudah ada pengajuan lembur tanggal ${p.input.tanggal} yang ${kata}. Batalkan dulu kalau mau mengganti.`,
    };
  }

  const pengajuan = await prisma.pengajuanLembur.create({
    data: {
      employeeId: p.employee.id,
      tanggal: atMidnight(p.input.tanggal),
      mulai: dur.nilai.mulai,
      selesai: dur.nilai.selesai,
      menit: dur.nilai.menit,
      alasan: p.input.alasan.trim(),
      sumber: p.sumber,
    },
  });

  if (p.sumber !== "admin") {
    await notifyManagers(
      "overtime_request",
      lemburNotificationData({
        pengajuanId: pengajuan.id,
        employeeId: p.employee.id,
        employeeName: p.employee.fullName,
        tanggal: p.input.tanggal,
        menit: dur.nilai.menit,
      })
    );
  }
  return { ok: true, pengajuan };
}

/** Bentuk yang dikirim ke portal karyawan / form. */
export function serializeLembur(r: PengajuanLembur) {
  return {
    id: r.id,
    tanggal: toYmd(r.tanggal),
    mulai: r.mulai,
    selesai: r.selesai,
    menit: r.menit,
    menitDisetujui: r.menitDisetujui,
    alasan: r.alasan,
    status: r.status,
    sumber: r.sumber,
    catatanKeputusan: r.catatanKeputusan,
    decidedAt: r.decidedAt,
    createdAt: r.createdAt,
  };
}

/** Kalimat peringatan yang sama di semua tempat. */
export const PESAN_BELUM_ADA_PULANG =
  "Belum ada scan pulang di tanggal itu; menit lembur tercatat di pengajuan, belum masuk struk. Tekan “Terapkan ulang” sesudah scan pulangnya ada.";
