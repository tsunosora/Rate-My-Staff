import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, notFound, route } from "@/lib/http";
import { rapikanWarna } from "@/lib/services/tim-kerja-admin/aturan";
import { pasangPic, unikBentrok } from "@/lib/services/tim-kerja-admin/layanan";
import { timUbahSchema } from "@/lib/services/tim-kerja-admin/skema";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Ubah tim: nama, warna, catatan, aktif, dan kepala tim (`picId`; null = lepas kepala tim).
 * Melepas kepala tim TIDAK mematikan izin "boleh absenkan tim" orangnya — itu diatur di
 * Pengaturan → Absen lewat HP.
 */
export const PATCH = route<Ctx>(async (req, ctx) => {
  await requireManager();
  const id = Number((await ctx.params).id);
  const parsed = timUbahSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const tim = await prisma.timKerja.findUnique({ where: { id }, select: { id: true, picId: true } });
  if (!tim) return notFound("Tim tidak ditemukan.");
  const u = parsed.data;

  try {
    await prisma.timKerja.update({
      where: { id },
      data: {
        ...(u.nama !== undefined && { nama: u.nama.replace(/\s+/g, " ") }),
        ...(u.warna !== undefined && { warna: rapikanWarna(u.warna) }),
        ...(u.aktif !== undefined && { aktif: u.aktif }),
        ...(u.catatan !== undefined && { catatan: u.catatan?.trim() || null }),
        ...(u.picId === null && { picId: null }),
      },
    });
  } catch (e) {
    if (unikBentrok(e)) return json({ message: `Nama tim "${u.nama}" sudah dipakai.` }, { status: 409 });
    throw e;
  }

  let peringatan: string | null = null;
  if (u.picId && u.picId !== tim.picId) {
    const pic = await pasangPic(prisma, id, u.picId);
    if (!pic.ok) return json({ message: pic.pesan }, { status: 409 });
    peringatan = pic.peringatan;
  }
  return json({ ok: true, peringatan });
});

/**
 * Hapus tim. Anggotanya jadi tanpa tim (bukan ikut terhapus) dan catatan harian mereka utuh —
 * rekap tidak merujuk tim. Untuk menyimpan riwayatnya, nonaktifkan saja.
 */
export const DELETE = route<Ctx>(async (_req, ctx) => {
  await requireManager();
  const id = Number((await ctx.params).id);
  const tim = await prisma.timKerja.findUnique({ where: { id }, select: { id: true } });
  if (!tim) return notFound("Tim tidak ditemukan.");
  await prisma.$transaction([
    prisma.employee.updateMany({ where: { timId: id }, data: { timId: null } }),
    prisma.timKerja.delete({ where: { id } }),
  ]);
  return json({ ok: true });
});
