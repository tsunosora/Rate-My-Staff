import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, notFound, route } from "@/lib/http";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  ip: z.string().trim().max(64).nullable().optional(),
  port: z.coerce.number().int().min(1).max(65535).nullable().optional(),
});

/** Ubah nama (label cabang) / IP / port mesin. */
export const PATCH = route<Ctx>(async (req, ctx) => {
  await requireManager();
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const existing = await prisma.machine.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Mesin tidak ditemukan");
  const m = await prisma.machine.update({ where: { id: Number(id) }, data: parsed.data });
  return json({ id: m.id, sn: m.sn, name: m.name, mode: m.mode, ip: m.ip, port: m.port });
});

/** Hapus mesin (enrollment ikut terhapus; machineId absensi jadi null, absensi tetap). */
export const DELETE = route<Ctx>(async (_req, ctx) => {
  await requireManager();
  const { id } = await ctx.params;
  const existing = await prisma.machine.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Mesin tidak ditemukan");
  await prisma.machine.delete({ where: { id: Number(id) } });
  return json({ ok: true });
});
