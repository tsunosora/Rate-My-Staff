import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, notFound, route } from "@/lib/http";
import { rewardUpdateSchema } from "@/lib/validators/points";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = route<Ctx>(async (req, ctx) => {
  await requireManager();
  const { id } = await ctx.params;
  const parsed = rewardUpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const existing = await prisma.reward.findFirst({ where: { id: Number(id), deletedAt: null } });
  if (!existing) return notFound("Hadiah tidak ditemukan");

  const d = parsed.data;
  const reward = await prisma.reward.update({
    where: { id: existing.id },
    data: {
      ...(d.name !== undefined && { name: d.name }),
      ...(d.description !== undefined && { description: d.description || null }),
      ...(d.type !== undefined && { type: d.type }),
      ...(d.pointCost !== undefined && { pointCost: d.pointCost }),
      ...(d.cashValue !== undefined && { cashValue: d.cashValue ?? null }),
      ...(d.stock !== undefined && { stock: d.stock ?? null }),
      ...(d.isActive !== undefined && { isActive: d.isActive }),
    },
  });
  return json(reward);
});

/** Hapus lunak — riwayat penukaran yang sudah terjadi tetap utuh. */
export const DELETE = route<Ctx>(async (_req, ctx) => {
  await requireManager();
  const { id } = await ctx.params;
  const existing = await prisma.reward.findFirst({ where: { id: Number(id), deletedAt: null } });
  if (!existing) return notFound("Hadiah tidak ditemukan");
  await prisma.reward.update({
    where: { id: existing.id },
    data: { deletedAt: new Date(), isActive: false },
  });
  return json({ ok: true });
});
