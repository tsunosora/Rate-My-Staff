import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, route } from "@/lib/http";
import { bacaRentang } from "@/lib/services/upah/aturan";
import { idPengguna, whereRekap } from "@/lib/services/upah/rekap";
import { setujuiMassalSchema } from "@/lib/services/upah/skema";

/**
 * "Setujui semua yang menunggu" untuk saringan yang sedang dilihat (tanggal+tim untuk satu kelompok,
 * atau seluruh saringan aktif). Satu updateMany bersyarat — klik ganda tidak menggandakan apa pun.
 * Hanya baris yang sudah ada saat daftar dimuat (`updatedAt <= dimuatAt`): baris yang diubah PIC
 * sesudah owner melihat layar tetap menunggu, tidak ikut disetujui tanpa dilihat.
 */
export const POST = route(async (req) => {
  const session = await requireManager();
  const parsed = setujuiMassalSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const d = parsed.data;
  const rentang = bacaRentang(d.dari, d.sampai, () => ({ dari: new Date(NaN), sampai: new Date(NaN) }));
  if ("galat" in rentang) return badRequest({ formErrors: [rentang.galat] });
  const dimuatAt = new Date(d.dimuatAt);
  if (Number.isNaN(dimuatAt.getTime())) return badRequest({ formErrors: ["Muat ulang halaman lalu coba lagi."] });

  const r = await prisma.rekapHarian.updateMany({
    where: {
      ...whereRekap({ rentang, timId: d.timId ?? null, employeeId: d.employeeId ?? null, persetujuan: "menunggu" }),
      pembayaranId: null,
      updatedAt: { lte: dimuatAt },
    },
    data: { persetujuan: "disetujui", alasanTolak: null, decidedById: await idPengguna(session.user?.email), decidedAt: new Date() },
  });
  return json({ ok: true, disetujui: r.count });
});
