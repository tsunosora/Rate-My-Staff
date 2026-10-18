import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { batasQuery, ymd, type Rentang } from "./aturan";
import {
  bagianBelumDibayar, hitungPeriode, statusBayar,
  type BarisHitung, type HitunganPeriode, type StatusBayar, type TarifKotaDivisiAktif, type TarifProyek,
} from "./hitung";

const angka = (d: Prisma.Decimal | number | null | undefined): number | null => (d == null ? null : Number(d));

/** Semua tarif yang dibutuhkan mesin hitung. Proyek nonaktif tetap ikut: baris lamanya masih menunjuknya. */
export async function muatTarif(): Promise<{ proyek: Map<number, TarifProyek>; kotaDivisi: TarifKotaDivisiAktif[] }> {
  const [proyek, kd] = await Promise.all([
    prisma.proyekKerja.findMany({ select: { id: true, nama: true, upahHarian: true, lemburPerJam: true } }),
    prisma.tarifKotaDivisi.findMany({ where: { aktif: true }, select: { kota: true, divisi: true, upahHarian: true, lemburPerJam: true } }),
  ]);
  return {
    proyek: new Map(proyek.map((p) => [p.id, { id: p.id, nama: p.nama, upahHarian: angka(p.upahHarian), lemburPerJam: angka(p.lemburPerJam) }])),
    kotaDivisi: kd.map((t) => ({ kota: t.kota, divisi: t.divisi, upahHarian: Number(t.upahHarian), lemburPerJam: angka(t.lemburPerJam) })),
  };
}

/** Isi `rincian` PembayaranUpah: salinan hitungan saat dibayar + identitas orangnya. */
export type RincianPembayaran = HitunganPeriode & {
  karyawan: { id: number; nama: string; kode: string; tim: string | null };
};

/** Baris yang sudah dibayar, diambil dari salinan saat dibayar (lihat hitungPeriode). */
async function barisBeku(pembayaranId: number[]): Promise<Map<number, BarisHitung>> {
  const peta = new Map<number, BarisHitung>();
  if (pembayaranId.length === 0) return peta;
  const bayar = await prisma.pembayaranUpah.findMany({ where: { id: { in: pembayaranId } }, select: { rincian: true } });
  for (const p of bayar) {
    const r = p.rincian as unknown as Partial<RincianPembayaran> | null;
    for (const b of r?.baris ?? []) if (b && typeof b.id === "number") peta.set(b.id, b);
  }
  return peta;
}

export type UpahOrang = {
  employeeId: number;
  nama: string;
  kode: string;
  jenis: string;
  tim: { id: number; nama: string } | null;
  hitungan: HitunganPeriode;
  belumDibayar: HitunganPeriode;
  statusBayar: StatusBayar;
  menunggu: number;
};

/**
 * Upah per orang untuk satu rentang. Ikut: siapa pun yang punya baris DISETUJUI, baris MENUNGGU
 * (supaya peringatan "belum dihitung" kelihatan), atau penyesuaian di rentang itu.
 */
export async function upahRentang(r: Rentang, saring: { timId?: number | null; employeeId?: number | null } = {}): Promise<UpahOrang[]> {
  const tanggal = batasQuery(r);
  const orangWhere: Prisma.EmployeeWhereInput = {
    ...(saring.timId ? { timId: saring.timId } : {}),
    ...(saring.employeeId ? { id: saring.employeeId } : {}),
  };
  const [baris, penyesuaian, tarif] = await Promise.all([
    prisma.rekapHarian.findMany({
      where: { tanggal, persetujuan: { in: ["disetujui", "menunggu"] }, employee: orangWhere },
      select: {
        id: true, employeeId: true, tanggal: true, status: true, lemburJam: true, kota: true, divisi: true, proyekId: true,
        upahKhusus: true, upahKhususCatatan: true, pembayaranId: true, persetujuan: true,
      },
    }),
    prisma.penyesuaianUpah.findMany({
      where: { tanggal, employee: orangWhere },
      select: { id: true, employeeId: true, tanggal: true, jenis: true, jumlah: true, catatan: true, pembayaranId: true },
    }),
    muatTarif(),
  ]);

  const idOrang = [...new Set([...baris.map((b) => b.employeeId), ...penyesuaian.map((p) => p.employeeId)])];
  if (idOrang.length === 0) return [];
  const [orang, beku] = await Promise.all([
    prisma.employee.findMany({
      where: { id: { in: idOrang } },
      select: {
        id: true, fullName: true, employeeCode: true, jenis: true, upahHarian: true, upahLemburPerJam: true,
        tim: { select: { id: true, nama: true } },
      },
    }),
    barisBeku([...new Set(baris.map((b) => b.pembayaranId).filter((x): x is number => x != null))]),
  ]);

  return orang
    .map((o) => {
      const milik = baris.filter((b) => b.employeeId === o.id);
      const hitungan = hitungPeriode({
        dari: r.dariYmd,
        sampai: r.sampaiYmd,
        baris: milik
          .filter((b) => b.persetujuan === "disetujui")
          .map((b) => ({
            id: b.id, tanggal: ymd(b.tanggal), status: b.status, lemburJam: Number(b.lemburJam), kota: b.kota, divisi: b.divisi,
            proyekId: b.proyekId, upahKhusus: angka(b.upahKhusus), upahKhususCatatan: b.upahKhususCatatan, pembayaranId: b.pembayaranId,
          })),
        penyesuaian: penyesuaian
          .filter((p) => p.employeeId === o.id)
          .map((p) => ({ id: p.id, tanggal: ymd(p.tanggal), jenis: p.jenis, jumlah: Number(p.jumlah), catatan: p.catatan, pembayaranId: p.pembayaranId })),
        karyawan: { upahHarian: angka(o.upahHarian), upahLemburPerJam: angka(o.upahLemburPerJam) },
        proyek: tarif.proyek,
        kotaDivisi: tarif.kotaDivisi,
        beku,
      });
      return {
        employeeId: o.id,
        nama: o.fullName,
        kode: o.employeeCode,
        jenis: o.jenis,
        tim: o.tim,
        hitungan,
        belumDibayar: bagianBelumDibayar(hitungan),
        statusBayar: statusBayar(hitungan),
        menunggu: milik.filter((b) => b.persetujuan === "menunggu").length,
      };
    })
    .sort((a, b) => a.nama.localeCompare(b.nama, "id-ID"));
}

/** Nama usaha untuk kop slip, dari setelan kalau ada. */
export async function namaUsaha(): Promise<string | null> {
  const rows = await prisma.setting.findMany({
    where: { key: { in: ["nama_usaha", "company_name", "app_name", "store_name"] } },
    select: { key: true, value: true },
  });
  for (const k of ["nama_usaha", "company_name", "store_name", "app_name"]) {
    const v = rows.find((r) => r.key === k)?.value?.trim();
    if (v) return v;
  }
  return null;
}
