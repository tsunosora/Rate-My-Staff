import { requireManager, badRequest, route } from "@/lib/http";
import { rentangUpah } from "@/lib/services/upah/aturan";
import { upahRentang } from "@/lib/services/upah/data";
import { buatEksporUpah } from "@/lib/services/upah/excel";

/** Ekspor Excel rekap upah satu periode (semua orang, atau satu tim lewat `?timId=`). */
export const GET = route(async (req) => {
  await requireManager();
  const p = new URL(req.url).searchParams;
  const r = rentangUpah(p.get("dari"), p.get("sampai"));
  if ("galat" in r) return badRequest({ formErrors: [r.galat] });
  const timId = Number(p.get("timId"));
  const orang = await upahRentang(r, { timId: Number.isInteger(timId) && timId > 0 ? timId : null });
  const buf = await buatEksporUpah(orang, r.dariYmd, r.sampaiYmd);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="upah-${r.dariYmd}-${r.sampaiYmd}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
});
