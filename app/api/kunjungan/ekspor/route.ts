import { badRequest, requireManager, route } from "@/lib/http";
import { ambilKunjungan, bacaSaring, bentukBaris, lebihDariRentang, ringkas, RENTANG_MAKS_HARI } from "@/lib/services/kunjungan/data";
import { bukuKunjungan } from "@/lib/services/kunjungan/ekspor";

/** OWNER — ekspor Excel kunjungan sesuai saringan yang sedang dipakai di halaman. */
export const GET = route(async (req: Request) => {
  await requireManager();
  const p = bacaSaring(req);
  if (!p.success) return badRequest(p.error.flatten());
  if (lebihDariRentang(p.data.start, p.data.end)) {
    return badRequest({ end: [`Rentang maksimal ${RENTANG_MAKS_HARI} hari.`] });
  }
  const now = Date.now();
  const { baris } = await ambilKunjungan(p.data);
  const rentang = p.data.start === p.data.end ? p.data.start : `${p.data.start} s.d. ${p.data.end}`;
  const buffer = await bukuKunjungan(
    baris.map((k) => bentukBaris(k, now)),
    ringkas(baris, now),
    `Kunjungan klien ${rentang}`,
  );
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="kunjungan-${p.data.start}_${p.data.end}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
});
