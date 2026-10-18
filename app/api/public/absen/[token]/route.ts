import { prisma } from "@/lib/prisma";
import { json, route } from "@/lib/http";
import { keadaanPortal } from "@/lib/services/portal/keadaan";
import { getSetting } from "@/lib/settings";
import { SETELAN_LUAR, luarDiizinkan } from "@/lib/services/absen-hp/aturan";

type Ctx = { params: Promise<{ token: string }> };

/**
 * PUBLIK — keadaan halaman absen HP. Sebelum lewat PIN cuma identitas ringkas (sama dengan
 * portal); sesudahnya juga absen hari ini, lokasi absen, dan apakah HP ini boleh dipakai.
 * Koordinat lokasi TIDAK dikirim — HP tidak perlu tahu titiknya, cukup nama & radius.
 */
export const GET = route<Ctx>(async (req, ctx) => {
  const { token } = await ctx.params;
  const { employee, publik } = await keadaanPortal(req, token);
  if (!publik.authenticated) return json(publik);

  const awalHari = new Date();
  awalHari.setHours(0, 0, 0, 0);
  const seminggu = new Date(awalHari);
  seminggu.setDate(seminggu.getDate() - 7);
  const [hariIni, lokasi, pengajuan, setelanLuar] = await Promise.all([
    prisma.attendance.findMany({
      where: { employeeId: employee.id, scanDate: { gte: awalHari } },
      orderBy: { scanDate: "asc" },
      select: { id: true, scanDate: true, scanType: true, machineName: true },
    }),
    prisma.absenLokasi.findMany({
      where: { aktif: true },
      orderBy: { nama: "asc" },
      select: { id: true, nama: true, radiusM: true, wajibQr: true },
    }),
    // Pengajuan absen di luar lokasi seminggu terakhir — karyawan perlu tahu sudah disetujui atau belum.
    prisma.absenHpBukti.findMany({
      where: { employeeId: employee.id, alasan: { not: null }, createdAt: { gte: seminggu } },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, createdAt: true, status: true, alasan: true, catatanKeputusan: true, jarakM: true, lokasi: { select: { nama: true } } },
    }),
    getSetting(SETELAN_LUAR),
  ]);

  return json({
    ...publik,
    absen: {
      aktif: employee.absenHp,
      hpTerkunci: employee.absenHpPerangkat !== null,
      bolehLuar: luarDiizinkan(setelanLuar),
      pengajuan: pengajuan.map((p) => ({
        id: p.id,
        jam: p.createdAt,
        status: p.status,
        alasan: p.alasan,
        catatan: p.catatanKeputusan,
        lokasi: p.lokasi?.nama ?? null,
        jarakM: p.jarakM < 0 ? null : p.jarakM,
      })),
      lokasi,
      hariIni: hariIni.map((a) => ({
        id: a.id,
        jam: a.scanDate,
        jenis: a.scanType,
        lewat: a.machineName === "hp" ? "hp" : "mesin",
      })),
    },
  });
});
