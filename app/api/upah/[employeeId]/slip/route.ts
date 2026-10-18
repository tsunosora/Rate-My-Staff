import { prisma } from "@/lib/prisma";
import { requireManager, badRequest, notFound, route } from "@/lib/http";
import { rentangUpah, ymd } from "@/lib/services/upah/aturan";
import { namaUsaha, upahRentang, type RincianPembayaran } from "@/lib/services/upah/data";
import { buatSlipPdf, type DataSlip } from "@/lib/services/upah/slip-pdf";

type Ctx = { params: Promise<{ employeeId: string }> };

/**
 * Slip upah PDF. `?pembayaranId=` = slip pembayaran yang sudah terjadi, dari salinan saat dibayar
 * (tarif yang berubah sesudahnya tidak mengubah slip lama). Tanpa itu = ringkasan perhitungan
 * periode `?dari=&sampai=` (belum tentu dibayar).
 */
export const GET = route<Ctx>(async (req, ctx) => {
  await requireManager();
  const employeeId = Number((await ctx.params).employeeId);
  if (!Number.isInteger(employeeId) || employeeId <= 0) return notFound("Karyawan tidak ditemukan.");
  const p = new URL(req.url).searchParams;
  const usaha = await namaUsaha();
  const dibuatAt = new Date().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  let data: DataSlip;

  if (p.get("pembayaranId")) {
    const pid = Number(p.get("pembayaranId"));
    const bayar = Number.isInteger(pid) && pid > 0
      ? await prisma.pembayaranUpah.findFirst({ where: { id: pid, employeeId } })
      : null;
    if (!bayar) return notFound("Pembayaran tidak ditemukan.");
    const r = bayar.rincian as unknown as RincianPembayaran;
    const oleh = bayar.dibayarOlehId
      ? await prisma.user.findUnique({ where: { id: bayar.dibayarOlehId }, select: { name: true } })
      : null;
    data = {
      namaUsaha: usaha,
      karyawan: { nama: r.karyawan?.nama ?? "-", kode: r.karyawan?.kode ?? "-", tim: r.karyawan?.tim ?? null },
      hitungan: { ...r, dari: r.dari ?? ymd(bayar.periodeMulai), sampai: r.sampai ?? ymd(bayar.periodeSelesai) },
      pembayaran: { dibayarAt: bayar.dibayarAt.toISOString(), jumlah: Number(bayar.jumlah), oleh: oleh?.name ?? null, catatan: bayar.catatan },
      dibuatAt,
    };
  } else {
    const r = rentangUpah(p.get("dari"), p.get("sampai"));
    if ("galat" in r) return badRequest({ formErrors: [r.galat] });
    const [o] = await upahRentang(r, { employeeId });
    if (!o) return notFound("Tidak ada data upah di periode ini.");
    data = {
      namaUsaha: usaha,
      karyawan: { nama: o.nama, kode: o.kode, tim: o.tim?.nama ?? null },
      hitungan: o.hitungan,
      pembayaran: null,
      dibuatAt,
    };
  }

  const buf = await buatSlipPdf([data]);
  const nama = `slip-upah-${data.karyawan.kode}-${data.hitungan.dari}`.replace(/[^\w.-]+/g, "-");
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nama}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
});
