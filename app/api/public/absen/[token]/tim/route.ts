import { prisma } from "@/lib/prisma";
import { json, route } from "@/lib/http";
import { awalHari, hitungStatus, saranTempat } from "@/lib/services/absen-tim/aturan";
import { wajibPic } from "@/lib/services/absen-tim/pic";

type Ctx = { params: Promise<{ token: string }> };

/**
 * PUBLIK (sesi PIN PIC) — keadaan layar "Absen tim": sesi PIC hari ini beserta barisnya, dan
 * saran nama tempat dari sesi-sesi sebelumnya. Koordinat sesi tidak dikirim balik (HP tidak perlu).
 * Baris dikelompokkan di HP per anggota; status + catatan owner ikut supaya PIC tahu hasilnya.
 */
export const GET = route<Ctx>(async (req, ctx) => {
  const { token } = await ctx.params;
  const pic = await wajibPic(token, req);
  const hariIni = awalHari(new Date());

  const [sesi, riwayat] = await Promise.all([
    prisma.sesiAbsenTim.findMany({
      where: { picId: pic.id, mulaiAt: { gte: hariIni } },
      orderBy: { mulaiAt: "desc" },
      select: {
        id: true, namaTempat: true, mulaiAt: true,
        baris: {
          orderBy: { waktu: "asc" },
          select: {
            id: true, jenis: true, waktu: true, status: true, catatanKeputusan: true,
            employee: { select: { id: true, fullName: true, jenis: true, perluDiperiksa: true } },
          },
        },
      },
    }),
    prisma.sesiAbsenTim.findMany({
      where: { picId: pic.id },
      orderBy: { mulaiAt: "desc" },
      take: 40,
      select: { namaTempat: true },
    }),
  ]);

  return json({
    pic: { id: pic.id, nama: pic.fullName },
    saran: saranTempat(riwayat),
    sesi: sesi.map((s) => ({
      id: s.id,
      namaTempat: s.namaTempat,
      mulaiAt: s.mulaiAt,
      jumlah: hitungStatus(s.baris),
      baris: s.baris.map((b) => ({
        id: b.id,
        jenis: b.jenis,
        jam: b.waktu,
        status: b.status,
        catatan: b.catatanKeputusan,
        karyawanId: b.employee.id,
        nama: b.employee.fullName,
        freelanceBaru: b.employee.jenis === "freelance" && b.employee.perluDiperiksa,
      })),
    })),
  });
});
