import type { Prisma } from "@prisma/client";
import { bacaRentang, batasQuery, PERSETUJUAN, ymd, type Rentang } from "./aturan";

/** Saringan layar persetujuan rekap. `timId: "tanpa"` = orang tanpa tim. */
export type SaringRekap = {
  rentang: Rentang;
  timId?: number | "tanpa" | null;
  persetujuan?: string | null;
  employeeId?: number | null;
};

/**
 * Tim sebuah baris = tim karyawannya; kalau dia belum masuk tim, tim PIC pencatatnya. Saringan tim
 * memakai aturan yang sama, supaya baris yang tampil di kelompok tim X juga yang ikut "setujui semua X".
 */
function saringTim(timId: SaringRekap["timId"]): Prisma.RekapHarianWhereInput {
  if (!timId) return {};
  if (timId === "tanpa") {
    return { employee: { timId: null }, OR: [{ dicatatOlehPicId: null }, { dicatatPic: { is: { timDipimpin: { is: null } } } }] };
  }
  return { OR: [{ employee: { timId } }, { employee: { timId: null }, dicatatPic: { is: { timDipimpin: { is: { id: timId } } } } }] };
}

const hariIni = () => {
  const d = new Date();
  const h = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return { dari: h, sampai: h };
};

/** Baca saringan dari query string; galat = pesan untuk pengguna. */
export function bacaSaring(p: URLSearchParams): SaringRekap | { galat: string } {
  const rentang = bacaRentang(p.get("dari"), p.get("sampai"), hariIni);
  if ("galat" in rentang) return rentang;
  const t = p.get("timId");
  const e = Number(p.get("employeeId"));
  const s = p.get("persetujuan");
  return {
    rentang,
    timId: t === "tanpa" ? "tanpa" : Number(t) > 0 ? Number(t) : null,
    employeeId: Number.isInteger(e) && e > 0 ? e : null,
    persetujuan: s && (PERSETUJUAN as readonly string[]).includes(s) ? s : null,
  };
}

export function whereRekap(s: SaringRekap): Prisma.RekapHarianWhereInput {
  return {
    tanggal: batasQuery(s.rentang),
    ...(s.persetujuan ? { persetujuan: s.persetujuan } : {}),
    ...(s.employeeId ? { employeeId: s.employeeId } : {}),
    ...saringTim(s.timId),
  };
}

export const pilihBaris = {
  id: true, employeeId: true, tanggal: true, status: true, lemburJam: true, kota: true, divisi: true, proyekId: true,
  catatan: true, fotoPath: true, lat: true, lng: true, akurasiM: true, sumber: true, persetujuan: true, decidedAt: true,
  alasanTolak: true, pembayaranId: true, updatedAt: true,
  employee: {
    select: {
      fullName: true, employeeCode: true, jenis: true, perluDiperiksa: true,
      tim: { select: { id: true, nama: true, warna: true } },
    },
  },
  dicatatPic: { select: { id: true, fullName: true, timDipimpin: { select: { id: true, nama: true, warna: true } } } },
  proyek: { select: { id: true, nama: true } },
  decidedBy: { select: { name: true } },
} satisfies Prisma.RekapHarianSelect;

export type BarisDb = Prisma.RekapHarianGetPayload<{ select: typeof pilihBaris }>;

export type BarisLayar = {
  id: number;
  employeeId: number;
  nama: string;
  kode: string;
  freelance: boolean;
  freelanceBaru: boolean;
  tanggal: string;
  status: string;
  lemburJam: number;
  kota: string | null;
  divisi: string | null;
  proyekId: number | null;
  proyek: string | null;
  catatan: string | null;
  foto: string | null;
  lat: number | null;
  lng: number | null;
  akurasiM: number | null;
  pic: string | null;
  sumber: string;
  persetujuan: string;
  diputusOleh: string | null;
  diputusAt: string | null;
  alasanTolak: string | null;
  dibayar: boolean;
  versi: string;
};

export function keLayar(b: BarisDb): BarisLayar {
  return {
    id: b.id,
    employeeId: b.employeeId,
    nama: b.employee.fullName,
    kode: b.employee.employeeCode,
    freelance: b.employee.jenis === "freelance",
    freelanceBaru: b.employee.perluDiperiksa,
    tanggal: ymd(b.tanggal),
    status: b.status,
    lemburJam: Number(b.lemburJam),
    kota: b.kota,
    divisi: b.divisi,
    proyekId: b.proyekId,
    proyek: b.proyek?.nama ?? null,
    catatan: b.catatan,
    foto: b.fotoPath ? `/api/rekap-tim/foto/${b.id}` : null,
    lat: b.lat,
    lng: b.lng,
    akurasiM: b.akurasiM,
    pic: b.dicatatPic?.fullName ?? null,
    sumber: b.sumber,
    persetujuan: b.persetujuan,
    diputusOleh: b.decidedBy?.name ?? null,
    diputusAt: b.decidedAt?.toISOString() ?? null,
    alasanTolak: b.alasanTolak,
    dibayar: b.pembayaranId != null,
    versi: b.updatedAt.toISOString(),
  };
}

export type KelompokTim = {
  timId: number | null;
  nama: string;
  warna: string | null;
  pic: string[];
  jumlah: { menunggu: number; disetujui: number; ditolak: number };
  baris: BarisLayar[];
};

/** Kelompokkan per tanggal (terbaru dulu) → per tim (nama), orang urut nama. */
export function kelompokkan(baris: BarisDb[]): { tanggal: string; tim: KelompokTim[] }[] {
  const perHari = new Map<string, Map<string, KelompokTim>>();
  for (const b of baris) {
    const t = b.employee.tim ?? b.dicatatPic?.timDipimpin ?? null;
    const hari = ymd(b.tanggal);
    const kunci = t ? String(t.id) : "tanpa";
    const peta = perHari.get(hari) ?? new Map<string, KelompokTim>();
    perHari.set(hari, peta);
    const k = peta.get(kunci) ?? {
      timId: t?.id ?? null,
      nama: t?.nama ?? "Tanpa tim",
      warna: t?.warna ?? null,
      pic: [],
      jumlah: { menunggu: 0, disetujui: 0, ditolak: 0 },
      baris: [],
    };
    peta.set(kunci, k);
    const l = keLayar(b);
    k.baris.push(l);
    if (l.pic && !k.pic.includes(l.pic)) k.pic.push(l.pic);
    if (l.persetujuan in k.jumlah) k.jumlah[l.persetujuan as keyof KelompokTim["jumlah"]] += 1;
  }
  return [...perHari.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([tanggal, peta]) => ({
      tanggal,
      tim: [...peta.values()]
        .sort((a, b) => (a.timId === null ? 1 : b.timId === null ? -1 : a.nama.localeCompare(b.nama, "id-ID")))
        .map((k) => ({ ...k, baris: k.baris.sort((a, b) => a.nama.localeCompare(b.nama, "id-ID")) })),
    }));
}

export { idPengguna } from "@/lib/services/absen-tim/simpan";
