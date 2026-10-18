import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, notFound, route } from "@/lib/http";
import { batasQuery, rentangUpah } from "@/lib/services/upah/aturan";
import { upahRentang, type RincianPembayaran } from "@/lib/services/upah/data";
import { idPengguna } from "@/lib/services/upah/rekap";
import { bayarSchema } from "@/lib/services/upah/skema";

type Ctx = { params: Promise<{ employeeId: string }> };

class Berubah extends Error {}

/**
 * Tandai dibayar: membuat PembayaranUpah berisi salinan hitungan saat itu, lalu mengikat baris
 * DISETUJUI & penyesuaian periode ini yang belum dibayar. Baris menunggu/ditolak tidak ikut.
 *
 * Aman dari klik ganda & perubahan di tengah jalan: `jumlahDilihat` harus sama dengan hitungan
 * server, dan pengikatan memakai updateMany bersyarat (id + updatedAt + belum dibayar + disetujui)
 * di dalam transaksi — kalau satu saja tidak cocok, seluruh pembayaran dibatalkan.
 */
export const POST = route<Ctx>(async (req, ctx) => {
  const session = await requireManager();
  const employeeId = Number((await ctx.params).employeeId);
  if (!Number.isInteger(employeeId) || employeeId <= 0) return notFound("Karyawan tidak ditemukan.");
  const parsed = bayarSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const d = parsed.data;
  const r = rentangUpah(d.dari, d.sampai);
  if ("galat" in r) return badRequest({ formErrors: [r.galat] });

  // Versi baris dibaca SEBELUM dihitung: perubahan sesudahnya membuat pengikatan gagal.
  const versi = await prisma.rekapHarian.findMany({
    where: { employeeId, tanggal: batasQuery(r), persetujuan: "disetujui", pembayaranId: null },
    select: { id: true, updatedAt: true },
  });
  const [o] = await upahRentang(r, { employeeId });
  if (!o) return json({ message: "Tidak ada yang bisa dibayar di periode ini." }, { status: 409 });
  const bagian = o.belumDibayar;
  if (bagian.baris.length === 0 && bagian.penyesuaian.length === 0) {
    return json({ message: "Semua di periode ini sudah dibayar." }, { status: 409 });
  }
  const jumlah = bagian.ringkas.total;
  if (Math.round(d.jumlahDilihat) !== jumlah) {
    return json({ message: "Jumlahnya berubah sejak layar dimuat. Muat ulang lalu periksa lagi." }, { status: 409 });
  }
  if (jumlah < 0) return json({ message: "Potongan dan kasbon lebih besar dari upahnya. Periksa penyesuaiannya." }, { status: 409 });

  const peta = new Map(versi.map((v) => [v.id, v.updatedAt]));
  if (bagian.baris.some((b) => !peta.has(b.id))) {
    return json({ message: "Ada baris yang baru saja berubah. Muat ulang lalu coba lagi." }, { status: 409 });
  }
  const rincian: RincianPembayaran = {
    ...bagian,
    karyawan: { id: o.employeeId, nama: o.nama, kode: o.kode, tim: o.tim?.nama ?? null },
  };
  const oleh = await idPengguna(session.user?.email);

  try {
    const bayar = await prisma.$transaction(async (tx) => {
      const p = await tx.pembayaranUpah.create({
        data: {
          employeeId,
          periodeMulai: r.dari,
          periodeSelesai: r.sampai,
          jumlah,
          rincian: rincian as unknown as object,
          catatan: d.catatan?.trim() || null,
          dibayarOlehId: oleh,
        },
        select: { id: true },
      });
      if (bagian.baris.length) {
        const ikat = await tx.rekapHarian.updateMany({
          where: {
            pembayaranId: null,
            persetujuan: "disetujui",
            OR: bagian.baris.map((b) => ({ id: b.id, updatedAt: peta.get(b.id) })),
          },
          data: { pembayaranId: p.id },
        });
        if (ikat.count !== bagian.baris.length) throw new Berubah();
      }
      if (bagian.penyesuaian.length) {
        const ikat = await tx.penyesuaianUpah.updateMany({
          where: { pembayaranId: null, id: { in: bagian.penyesuaian.map((x) => x.id) } },
          data: { pembayaranId: p.id },
        });
        if (ikat.count !== bagian.penyesuaian.length) throw new Berubah();
      }
      return p;
    });
    return json({ ok: true, id: bayar.id, jumlah }, { status: 201 });
  } catch (e) {
    if (e instanceof Berubah) {
      return json({ message: "Ada yang berubah atau sudah dibayar barusan. Muat ulang lalu periksa lagi." }, { status: 409 });
    }
    throw e;
  }
});
