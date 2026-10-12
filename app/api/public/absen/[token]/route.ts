import { prisma } from "@/lib/prisma";
import { json, route } from "@/lib/http";
import { keadaanPortal } from "@/lib/services/portal/keadaan";

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
  const [hariIni, lokasi] = await Promise.all([
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
  ]);

  return json({
    ...publik,
    absen: {
      aktif: employee.absenHp,
      hpTerkunci: employee.absenHpPerangkat !== null,
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
