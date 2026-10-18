import { requireManager, json, badRequest, route } from "@/lib/http";
import { rentangUpah } from "@/lib/services/upah/aturan";
import { upahRentang } from "@/lib/services/upah/data";

/**
 * Rekap upah per orang untuk satu periode. `?dari=&sampai=` (bawaan minggu ini Senin–Minggu,
 * maks 31 hari), `?timId=`. Yang dihitung hanya baris DISETUJUI; `menunggu` = baris yang belum
 * diputus (belum ikut dihitung).
 */
export const GET = route(async (req) => {
  await requireManager();
  const p = new URL(req.url).searchParams;
  const r = rentangUpah(p.get("dari"), p.get("sampai"));
  if ("galat" in r) return badRequest({ formErrors: [r.galat] });
  const timId = Number(p.get("timId"));
  const orang = await upahRentang(r, { timId: Number.isInteger(timId) && timId > 0 ? timId : null });
  return json({
    dari: r.dariYmd,
    sampai: r.sampaiYmd,
    total: orang.reduce((n, o) => n + o.hitungan.ringkas.total, 0),
    belumDibayar: orang.reduce((n, o) => n + o.belumDibayar.ringkas.total, 0),
    orang: orang.map((o) => ({
      employeeId: o.employeeId,
      nama: o.nama,
      kode: o.kode,
      freelance: o.jenis === "freelance",
      tim: o.tim,
      ringkas: o.hitungan.ringkas,
      belumDibayar: o.belumDibayar.ringkas.total,
      statusBayar: o.statusBayar,
      menunggu: o.menunggu,
    })),
  });
});
