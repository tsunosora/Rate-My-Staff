import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, notFound, route } from "@/lib/http";
import { keluarkanAnggota, tambahAnggota } from "@/lib/services/tim-kerja/service";
import { anggotaSchema } from "@/lib/services/tim-kerja-admin/skema";

type Ctx = { params: Promise<{ id: string }> };

const timAda = (id: number) => prisma.timKerja.findUnique({ where: { id }, select: { id: true } });

/** Masukkan karyawan ke tim — admin BOLEH memindahkan dari tim lain. */
export const POST = route<Ctx>(async (req, ctx) => {
  await requireManager();
  const id = Number((await ctx.params).id);
  const parsed = anggotaSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  if (!(await timAda(id))) return notFound("Tim tidak ditemukan.");

  // Kepala tim lain tidak dipindah diam-diam: tim lamanya jadi tanpa kepala.
  const memimpin = await prisma.timKerja.findFirst({
    where: { picId: parsed.data.employeeId, NOT: { id } },
    select: { nama: true },
  });
  if (memimpin) {
    return json({ message: `Orang ini kepala tim "${memimpin.nama}". Ganti kepala tim itu dulu.` }, { status: 409 });
  }

  const r = await tambahAnggota(prisma, id, parsed.data.employeeId, { bolehPindah: true });
  if (!r.ok) return json({ message: r.alasan }, { status: 409 });
  return json({ ok: true, sudahAnggota: r.sudahAnggota });
});

/** Keluarkan karyawan dari tim: `?employeeId=N`. Kepala tim tidak bisa dikeluarkan. */
export const DELETE = route<Ctx>(async (req, ctx) => {
  await requireManager();
  const id = Number((await ctx.params).id);
  const employeeId = Number(new URL(req.url).searchParams.get("employeeId"));
  if (!Number.isInteger(employeeId) || employeeId <= 0) return json({ message: "Karyawan tidak sah." }, { status: 422 });
  if (!(await timAda(id))) return notFound("Tim tidak ditemukan.");
  const r = await keluarkanAnggota(prisma, id, employeeId);
  if (!r.ok) return json({ message: r.alasan }, { status: 409 });
  return json({ ok: true });
});
