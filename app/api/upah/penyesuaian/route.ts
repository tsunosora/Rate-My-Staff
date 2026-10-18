import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, route } from "@/lib/http";
import { dariYmd, teksAtauNull } from "@/lib/services/upah/aturan";
import { idPengguna } from "@/lib/services/upah/rekap";
import { penyesuaianSchema } from "@/lib/services/upah/skema";

/**
 * Tambah penyesuaian upah: bonus / tunjangan (menambah), potongan / kasbon (mengurangi).
 * `jumlah` selalu positif; tandanya dari jenis. Masuk ke periode yang memuat `tanggal`.
 */
export const POST = route(async (req) => {
  const session = await requireManager();
  const parsed = penyesuaianSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const d = parsed.data;
  const tanggal = dariYmd(d.tanggal);
  if (!tanggal) return badRequest({ tanggal: ["Tanggal tidak dikenal."] });
  const orang = await prisma.employee.findUnique({ where: { id: d.employeeId }, select: { id: true } });
  if (!orang) return badRequest({ formErrors: ["Karyawan tidak ditemukan."] });

  const p = await prisma.penyesuaianUpah.create({
    data: {
      employeeId: d.employeeId,
      tanggal,
      jenis: d.jenis,
      jumlah: Math.round(d.jumlah),
      catatan: teksAtauNull(d.catatan, 255),
      dibuatOlehId: await idPengguna(session.user?.email),
    },
    select: { id: true },
  });
  return json({ ok: true, id: p.id }, { status: 201 });
});
