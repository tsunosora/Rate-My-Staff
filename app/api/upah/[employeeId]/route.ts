import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, notFound, route } from "@/lib/http";
import { batasQuery, rentangUpah, tambahHari, ymd } from "@/lib/services/upah/aturan";
import { upahRentang } from "@/lib/services/upah/data";

type Ctx = { params: Promise<{ employeeId: string }> };

/**
 * Rincian upah satu orang satu periode: per hari (dengan sumber tarif), penyesuaian, bagian yang
 * belum dibayar, pembayaran yang menyentuh periode ini, dan tanggal yang masih menunggu persetujuan.
 */
export const GET = route<Ctx>(async (req, ctx) => {
  await requireManager();
  const employeeId = Number((await ctx.params).employeeId);
  if (!Number.isInteger(employeeId) || employeeId <= 0) return notFound("Karyawan tidak ditemukan.");
  const p = new URL(req.url).searchParams;
  const r = rentangUpah(p.get("dari"), p.get("sampai"));
  if ("galat" in r) return badRequest({ formErrors: [r.galat] });

  const orang = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      id: true, fullName: true, employeeCode: true, jenis: true, upahHarian: true, upahLemburPerJam: true,
      kotaBawaan: true, divisiBawaan: true, tim: { select: { id: true, nama: true } },
    },
  });
  if (!orang) return notFound("Karyawan tidak ditemukan.");

  const [hasil] = await upahRentang(r, { employeeId });
  const dipakai = new Set<number>();
  for (const b of hasil?.hitungan.baris ?? []) if (b.pembayaranId != null) dipakai.add(b.pembayaranId);
  for (const x of hasil?.hitungan.penyesuaian ?? []) if (x.pembayaranId != null) dipakai.add(x.pembayaranId);

  const [pembayaran, menunggu] = await Promise.all([
    prisma.pembayaranUpah.findMany({
      where: {
        employeeId,
        OR: [{ id: { in: [...dipakai] } }, { periodeMulai: { lt: tambahHari(r.sampai, 1) }, periodeSelesai: { gte: r.dari } }],
      },
      orderBy: { dibayarAt: "desc" },
      select: { id: true, periodeMulai: true, periodeSelesai: true, jumlah: true, catatan: true, dibayarAt: true, dibayarOlehId: true },
    }),
    prisma.rekapHarian.findMany({
      where: { employeeId, tanggal: batasQuery(r), persetujuan: "menunggu" },
      orderBy: { tanggal: "asc" },
      select: { id: true, tanggal: true, status: true },
    }),
  ]);
  const oleh = await prisma.user.findMany({
    where: { id: { in: pembayaran.map((x) => x.dibayarOlehId).filter((x): x is number => x != null) } },
    select: { id: true, name: true },
  });

  return json({
    dari: r.dariYmd,
    sampai: r.sampaiYmd,
    karyawan: {
      id: orang.id,
      nama: orang.fullName,
      kode: orang.employeeCode,
      freelance: orang.jenis === "freelance",
      tim: orang.tim,
      upahHarian: orang.upahHarian == null ? null : Number(orang.upahHarian),
      upahLemburPerJam: orang.upahLemburPerJam == null ? null : Number(orang.upahLemburPerJam),
    },
    hitungan: hasil?.hitungan ?? null,
    belumDibayar: hasil?.belumDibayar.ringkas ?? null,
    statusBayar: hasil?.statusBayar ?? "kosong",
    menunggu: menunggu.map((m) => ({ id: m.id, tanggal: ymd(m.tanggal), status: m.status })),
    pembayaran: pembayaran.map((x) => ({
      id: x.id,
      periodeMulai: ymd(x.periodeMulai),
      periodeSelesai: ymd(x.periodeSelesai),
      jumlah: Number(x.jumlah),
      catatan: x.catatan,
      dibayarAt: x.dibayarAt.toISOString(),
      oleh: oleh.find((u) => u.id === x.dibayarOlehId)?.name ?? null,
    })),
  });
});
