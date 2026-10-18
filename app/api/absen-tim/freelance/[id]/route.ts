import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, notFound, route } from "@/lib/http";
import { periksaFreelanceSchema } from "@/lib/services/absen-tim/skema";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Freelance baru: "periksa" = owner/HR sudah memastikan orangnya ada (label hilang);
 * "nonaktifkan" = tukang fiktif / tidak bekerja lagi — dikeluarkan dari batas jumlah karyawan,
 * riwayat absennya tetap. Absennya yang masih menunggu tidak ikut diputus; owner menolaknya
 * sendiri di sesinya.
 */
export const PATCH = route<Ctx>(async (req, ctx) => {
  await requireManager();
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return notFound("Karyawan tidak ditemukan.");
  const parsed = periksaFreelanceSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const e = await prisma.employee.findFirst({ where: { id, deletedAt: null, jenis: "freelance" }, select: { id: true } });
  if (!e) return notFound("Freelance tidak ditemukan.");

  await prisma.employee.update({
    where: { id },
    data: parsed.data.aksi === "periksa" ? { perluDiperiksa: false } : { isActive: false, perluDiperiksa: false },
  });
  return json({ ok: true });
});
