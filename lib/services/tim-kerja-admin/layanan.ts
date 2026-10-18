import { Prisma, type PrismaClient } from "@prisma/client";
import { tambahAnggota } from "@/lib/services/tim-kerja/service";
import { bolehJadiPic } from "./aturan";

/**
 * Operasi tim yang khusus halaman admin. Anggota memakai lib/services/tim-kerja (milik absen tim),
 * di sini cuma kepala tim dan bentuk daftar untuk layar.
 */

export const unikBentrok = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

export type HasilPic = { ok: true; peringatan: string | null } | { ok: false; pesan: string };

/**
 * Jadikan karyawan kepala tim: dia dimasukkan ke tim itu (dipindah kalau perlu — wewenang admin)
 * dan izin "boleh absenkan tim" dinyalakan. Peringatan kalau absen HP-nya belum aktif, karena
 * PIC mengabsenkan timnya dari HP-nya sendiri.
 */
export async function pasangPic(prisma: PrismaClient, timId: number, employeeId: number): Promise<HasilPic> {
  const e = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      id: true, fullName: true, isActive: true, deletedAt: true, absenHp: true,
      timDipimpin: { select: { id: true, nama: true } },
    },
  });
  if (!e) return { ok: false, pesan: "Karyawan tidak ditemukan." };
  const boleh = bolehJadiPic({ timTujuanId: timId, karyawan: e, memimpinTim: e.timDipimpin });
  if (!boleh.ok) return boleh;

  const masuk = await tambahAnggota(prisma, timId, employeeId, { bolehPindah: true });
  if (!masuk.ok) return { ok: false, pesan: masuk.alasan };
  try {
    await prisma.$transaction([
      prisma.timKerja.update({ where: { id: timId }, data: { picId: employeeId } }),
      prisma.employee.update({ where: { id: employeeId }, data: { bisaAbsenTim: true } }),
    ]);
  } catch (err) {
    if (unikBentrok(err)) return { ok: false, pesan: "Karyawan ini baru saja dijadikan PIC tim lain. Muat ulang halaman." };
    throw err;
  }
  return {
    ok: true,
    peringatan: e.absenHp
      ? null
      : `${e.fullName} belum memakai absen HP. Nyalakan di Pengaturan → Absen lewat HP supaya bisa mengabsenkan timnya.`,
  };
}

/** Semua tim + anggota aktifnya, dan karyawan aktif (untuk pilihan PIC & anggota). */
export async function daftarTimAdmin(prisma: PrismaClient) {
  const [tim, karyawan] = await Promise.all([
    prisma.timKerja.findMany({
      orderBy: [{ aktif: "desc" }, { nama: "asc" }],
      include: {
        pic: { select: { id: true, fullName: true, absenHp: true, isActive: true, deletedAt: true } },
        anggota: {
          where: { deletedAt: null, isActive: true },
          orderBy: { fullName: "asc" },
          select: { id: true, fullName: true, jenis: true, perluDiperiksa: true, position: { select: { name: true } } },
        },
      },
    }),
    prisma.employee.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, jenis: true, timId: true, absenHp: true, timDipimpin: { select: { id: true } } },
    }),
  ]);
  return {
    tim: tim.map((t) => ({
      id: t.id,
      nama: t.nama,
      warna: t.warna,
      aktif: t.aktif,
      catatan: t.catatan,
      pic:
        t.pic && !t.pic.deletedAt
          ? { id: t.pic.id, nama: t.pic.fullName, absenHp: t.pic.absenHp, aktif: t.pic.isActive }
          : null,
      anggota: t.anggota.map((a) => ({
        id: a.id,
        nama: a.fullName,
        jabatan: a.position?.name ?? null,
        freelance: a.jenis === "freelance",
        perluDiperiksa: a.perluDiperiksa,
      })),
    })),
    karyawan: karyawan.map((k) => ({
      id: k.id,
      nama: k.fullName,
      freelance: k.jenis === "freelance",
      timId: k.timId,
      absenHp: k.absenHp,
      memimpinTimId: k.timDipimpin?.id ?? null,
    })),
  };
}
