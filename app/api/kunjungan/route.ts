import { prisma } from "@/lib/prisma";
import { badRequest, json, requireManager, route } from "@/lib/http";
import { ambilKunjungan, bacaSaring, bentukBaris, lebihDariRentang, ringkas, RENTANG_MAKS_HARI } from "@/lib/services/kunjungan/data";

/** OWNER — daftar kunjungan klien dalam rentang + ringkasan per karyawan. */
export const GET = route(async (req: Request) => {
  await requireManager();
  const p = bacaSaring(req);
  if (!p.success) return badRequest(p.error.flatten());
  if (lebihDariRentang(p.data.start, p.data.end)) {
    return badRequest({ end: [`Rentang maksimal ${RENTANG_MAKS_HARI} hari.`] });
  }

  const now = Date.now();
  const [{ baris, terpotong }, karyawan] = await Promise.all([
    ambilKunjungan(p.data),
    prisma.employee.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    }),
  ]);

  return json({
    saring: p.data,
    items: baris.map((k) => bentukBaris(k, now)),
    ringkasan: ringkas(baris, now),
    terpotong,
    karyawan: karyawan.map((e) => ({ id: e.id, nama: e.fullName })),
  });
});
