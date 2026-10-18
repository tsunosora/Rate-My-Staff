import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, notFound, route } from "@/lib/http";
import { ubahKaryawanSchema } from "@/lib/services/absen-hp/skema";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Nyalakan/matikan absen HP untuk satu karyawan, atau lepas kunci HP-nya.
 * Menyalakan membuatkan tautan pribadi (publicToken) kalau belum ada — tautan yang sama
 * dengan portal & rating, jadi karyawan tetap punya SATU tautan.
 */
export const PATCH = route<Ctx>(async (req, ctx) => {
  await requireManager();
  const id = Number((await ctx.params).id);
  const parsed = ubahKaryawanSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const e = await prisma.employee.findFirst({ where: { id, deletedAt: null }, select: { id: true, publicToken: true } });
  if (!e) return notFound("Karyawan tidak ditemukan.");

  const { aktif, lepasHp, pic } = parsed.data;
  await prisma.employee.update({
    where: { id },
    data: {
      ...(aktif !== undefined ? { absenHp: aktif } : {}),
      ...(aktif && !e.publicToken ? { publicToken: randomUUID() } : {}),
      ...(lepasHp ? { absenHpPerangkat: null, absenHpPerangkatAt: null } : {}),
      ...(pic !== undefined ? { bisaAbsenTim: pic } : {}),
    },
  });
  return json({ ok: true });
});
