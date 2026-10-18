import { Prisma, type PrismaClient } from "@prisma/client";
import { bolehKeluarkan, bolehTambahAnggota, namaTimBaru, pilihTimPic, type Tolak } from "./aturan";

/**
 * Tim kerja — operasi basis data. Dipakai layar HP PIC (rute /api/public/absen/[token]/tim/*)
 * dan halaman admin (rute /api/tim-kerja/*). Keputusannya di ./aturan (murni, teruji); di sini
 * cuma membaca, menulis, dan menahan balapan dua ketukan serentak.
 */

export type TimRingkas = { id: number; nama: string; picId: number | null; aktif: boolean; picNama: string | null };

const pilihTim = { id: true, nama: true, picId: true, aktif: true, pic: { select: { fullName: true } } } as const;
const ringkas = (t: { id: number; nama: string; picId: number | null; aktif: boolean; pic: { fullName: string } | null }): TimRingkas => ({
  id: t.id,
  nama: t.nama,
  picId: t.picId,
  aktif: t.aktif,
  picNama: t.pic?.fullName ?? null,
});

const unikBentrok = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

/**
 * Tim yang dipakai PIC ini (lihat pilihTimPic): yang dia pimpin, lalu tempat dia jadi anggota, dan
 * kalau belum ada sama sekali DIBUATKAN "Tim <nama PIC>" — dia kepala tim sekaligus anggotanya.
 *
 * Dua permintaan serentak dari PIC yang sama (dua tab) bisa sama-sama mencoba membuat tim: picId
 * dan nama tim unik di basis data, jadi yang kalah menangkap P2002 lalu membaca tim pemenangnya.
 */
export async function timUntukPic(prisma: PrismaClient, picId: number): Promise<TimRingkas> {
  for (let percobaan = 0; percobaan < 3; percobaan++) {
    const pic = await prisma.employee.findUnique({
      where: { id: picId },
      select: { id: true, fullName: true, timId: true, timDipimpin: { select: { id: true } } },
    });
    if (!pic) throw new Error("pic_tidak_ada");
    const pilih = pilihTimPic({ timId: pic.timId, timDipimpinId: pic.timDipimpin?.id ?? null });

    if ("pakai" in pilih) {
      if (pilih.perluMasukkanPic) {
        // Kepala tim yang belum tercatat sebagai anggotanya sendiri (dibuat admin tanpa anggota).
        await prisma.employee.updateMany({ where: { id: pic.id, timId: null }, data: { timId: pilih.pakai } });
      }
      const t = await prisma.timKerja.findUnique({ where: { id: pilih.pakai }, select: pilihTim });
      if (t) return ringkas(t);
      continue; // tim baru saja dihapus — ulangi
    }

    const ada = await prisma.timKerja.findMany({ where: { nama: { startsWith: `Tim ${pic.fullName.trim().slice(0, 40)}` } }, select: { nama: true } });
    try {
      const t = await prisma.$transaction(async (tx) => {
        const baru = await tx.timKerja.create({ data: { nama: namaTimBaru(pic.fullName, ada.map((a) => a.nama)), picId: pic.id }, select: pilihTim });
        await tx.employee.updateMany({ where: { id: pic.id, timId: null }, data: { timId: baru.id } });
        return baru;
      });
      return ringkas(t);
    } catch (e) {
      if (!unikBentrok(e)) throw e;
      // Kalah balapan (tim untuk PIC ini sudah dibuat permintaan lain) atau nama bentrok — ulangi.
    }
  }
  throw new Error("tim_gagal_dibuat");
}

/**
 * Masukkan karyawan ke tim. Bersyarat di basis data (`timId` masih sama dengan yang dibaca), jadi
 * dua PIC yang serentak menambahkan orang yang sama tidak saling menimpa: yang kedua ditolak
 * "sudah di Tim X". `bolehPindah` hanya untuk admin.
 */
export async function tambahAnggota(
  prisma: PrismaClient,
  timId: number,
  employeeId: number,
  opsi: { bolehPindah?: boolean } = {},
): Promise<{ ok: true; sudahAnggota: boolean } | Tolak> {
  for (let percobaan = 0; percobaan < 2; percobaan++) {
    const e = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, isActive: true, deletedAt: true, timId: true, tim: { select: { nama: true } } },
    });
    const k = bolehTambahAnggota(timId, e && { ...e, namaTimSekarang: e.tim?.nama ?? null }, opsi.bolehPindah);
    if (!k.ok || k.sudahAnggota) return k;
    const r = await prisma.employee.updateMany({ where: { id: employeeId, timId: e!.timId }, data: { timId } });
    if (r.count > 0) return { ok: true, sudahAnggota: false };
  }
  return { ok: false, kode: "berubah", alasan: "Data orang ini baru saja berubah. Muat ulang lalu coba lagi." };
}

/** Keluarkan karyawan dari tim (timId → null). Kepala tim tidak bisa dikeluarkan. */
export async function keluarkanAnggota(prisma: PrismaClient, timId: number, employeeId: number): Promise<{ ok: true } | Tolak> {
  const [tim, anggota] = await Promise.all([
    prisma.timKerja.findUnique({ where: { id: timId }, select: { id: true, picId: true } }),
    prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true, timId: true } }),
  ]);
  if (!tim) return { ok: false, kode: "tim", alasan: "Tim tidak ditemukan." };
  const k = bolehKeluarkan(tim, anggota);
  if (!k.ok) return k;
  await prisma.employee.updateMany({ where: { id: employeeId, timId }, data: { timId: null } });
  return { ok: true };
}

/** Anggota aktif satu tim, untuk layar HP & halaman admin. Kepala tim di urutan pertama. */
export async function anggotaTim(prisma: PrismaClient, tim: { id: number; picId: number | null }) {
  const daftar = await prisma.employee.findMany({
    where: { timId: tim.id, deletedAt: null, isActive: true },
    orderBy: { fullName: "asc" },
    select: {
      id: true, fullName: true, nickname: true, jenis: true, perluDiperiksa: true,
      kotaBawaan: true, divisiBawaan: true, position: { select: { name: true } },
    },
  });
  return daftar.sort((a, b) => Number(b.id === tim.picId) - Number(a.id === tim.picId));
}
