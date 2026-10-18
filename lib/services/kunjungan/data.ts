import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { atMidnight, toYmd } from "@/lib/services/leave/service";
import { saringKunjunganSchema, type SaringKunjungan } from "@/lib/validators/kunjungan";
import {
  durasiMenit,
  jarakMasukKeluar,
  labelHasil,
  penandaKunjungan,
  ringkasPerKaryawan,
  statusKunjungan,
  tautanPeta,
} from "./aturan";

/** Rentang terpanjang sekali ambil — lebih dari ini halaman & ekspor jadi berat. */
export const RENTANG_MAKS_HARI = 93;
export const BARIS_MAKS = 2000;

/** Saringan dari query halaman owner; tanggal kosong = hari ini. Dipakai daftar & ekspor. */
export function bacaSaring(req: Request) {
  const sp = new URL(req.url).searchParams;
  const start = sp.get("start") || toYmd(new Date());
  return saringKunjunganSchema.safeParse({
    start,
    end: sp.get("end") || start,
    employeeId: sp.get("employeeId") || undefined,
    hasil: sp.get("hasil") || undefined,
  });
}

export function lebihDariRentang(start: string, end: string): boolean {
  const hari = (atMidnight(end).getTime() - atMidnight(start).getTime()) / 86_400_000;
  return hari + 1 > RENTANG_MAKS_HARI;
}

export function whereSaring(s: SaringKunjungan): Prisma.KunjunganKlienWhereInput {
  const akhir = atMidnight(s.end);
  akhir.setDate(akhir.getDate() + 1);
  return {
    masukAt: { gte: atMidnight(s.start), lt: akhir },
    ...(s.employeeId ? { employeeId: s.employeeId } : {}),
    ...(s.hasil === "tanpa_hasil" ? { hasil: null } : s.hasil ? { hasil: s.hasil } : {}),
  };
}

const PILIH = {
  id: true,
  employeeId: true,
  namaKlien: true,
  alamat: true,
  tujuan: true,
  masukAt: true,
  masukLat: true,
  masukLng: true,
  masukAkurasiM: true,
  masukFoto: true,
  keluarAt: true,
  keluarLat: true,
  keluarLng: true,
  keluarAkurasiM: true,
  hasil: true,
  catatan: true,
  employee: { select: { fullName: true, employeeCode: true } },
} satisfies Prisma.KunjunganKlienSelect;

export type BarisKunjungan = Prisma.KunjunganKlienGetPayload<{ select: typeof PILIH }>;

/** Bentuk satu baris untuk klien (halaman owner) — penanda & jarak dihitung di server. */
export function bentukBaris(k: BarisKunjungan, nowMs: number) {
  return {
    id: k.id,
    employeeId: k.employeeId,
    nama: k.employee.fullName,
    kode: k.employee.employeeCode,
    namaKlien: k.namaKlien,
    alamat: k.alamat,
    tujuan: k.tujuan,
    masukAt: k.masukAt.toISOString(),
    keluarAt: k.keluarAt?.toISOString() ?? null,
    durasiMenit: durasiMenit(k.masukAt, k.keluarAt),
    jarakM: jarakMasukKeluar(k),
    petaMasuk: tautanPeta(k.masukLat, k.masukLng),
    petaKeluar: k.keluarLat !== null && k.keluarLng !== null ? tautanPeta(k.keluarLat, k.keluarLng) : null,
    akurasiMasukM: k.masukAkurasiM,
    akurasiKeluarM: k.keluarAkurasiM,
    adaFoto: Boolean(k.masukFoto),
    hasil: k.hasil,
    catatan: k.catatan,
    status: statusKunjungan(k, nowMs),
    penanda: penandaKunjungan(k, nowMs),
  };
}

export async function ambilKunjungan(s: SaringKunjungan) {
  const baris = await prisma.kunjunganKlien.findMany({
    where: whereSaring(s),
    orderBy: [{ masukAt: "desc" }, { id: "desc" }],
    take: BARIS_MAKS + 1,
    select: PILIH,
  });
  const terpotong = baris.length > BARIS_MAKS;
  return { baris: terpotong ? baris.slice(0, BARIS_MAKS) : baris, terpotong };
}

export function ringkas(baris: BarisKunjungan[], nowMs: number) {
  return ringkasPerKaryawan(
    baris.map((k) => ({ ...k, nama: k.employee.fullName })),
    nowMs,
  );
}

export { labelHasil };
