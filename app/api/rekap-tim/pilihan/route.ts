import { prisma } from "@/lib/prisma";
import { requireManager, json, route } from "@/lib/http";

/**
 * Isi saringan & formulir layar persetujuan rekap: tim, orang, proyek, dan kota/divisi yang sudah
 * pernah dipakai (untuk saran ketik). Proyek nonaktif ikut, ditandai — baris lama masih menunjuknya.
 */
export const GET = route(async () => {
  await requireManager();
  const [tim, karyawan, proyek, kota, divisi, kd] = await Promise.all([
    prisma.timKerja.findMany({ orderBy: { nama: "asc" }, select: { id: true, nama: true, warna: true, aktif: true } }),
    prisma.employee.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, employeeCode: true, timId: true, kotaBawaan: true, divisiBawaan: true, jenis: true },
    }),
    prisma.proyekKerja.findMany({ orderBy: [{ aktif: "desc" }, { nama: "asc" }], select: { id: true, nama: true, kode: true, aktif: true } }),
    prisma.rekapHarian.findMany({ where: { kota: { not: null } }, distinct: ["kota"], select: { kota: true }, take: 200 }),
    prisma.rekapHarian.findMany({ where: { divisi: { not: null } }, distinct: ["divisi"], select: { divisi: true }, take: 200 }),
    prisma.tarifKotaDivisi.findMany({ select: { kota: true, divisi: true } }),
  ]);
  const unik = (xs: (string | null)[]) =>
    [...new Set(xs.filter((x): x is string => !!x && !!x.trim()))].sort((a, b) => a.localeCompare(b, "id-ID"));
  return json({
    tim,
    karyawan: karyawan.map((k) => ({
      id: k.id, nama: k.fullName, kode: k.employeeCode, timId: k.timId, kota: k.kotaBawaan, divisi: k.divisiBawaan,
      freelance: k.jenis === "freelance",
    })),
    proyek,
    kota: unik([...kota.map((k) => k.kota), ...kd.map((k) => k.kota), ...karyawan.map((k) => k.kotaBawaan)]),
    divisi: unik([...divisi.map((k) => k.divisi), ...kd.map((k) => k.divisi), ...karyawan.map((k) => k.divisiBawaan)]),
  });
});
