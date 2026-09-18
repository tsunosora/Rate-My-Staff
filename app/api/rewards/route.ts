import { prisma } from "@/lib/prisma";
import { requireSession, requireManager, json, badRequest, route } from "@/lib/http";
import { rewardSchema } from "@/lib/validators/points";

/** Katalog hadiah (owner/manajemen). */
export const GET = route(async () => {
  await requireSession();
  const rewards = await prisma.reward.findMany({
    where: { deletedAt: null },
    orderBy: [{ isActive: "desc" }, { pointCost: "asc" }],
  });
  return json(rewards.map((r) => ({ ...r, cashValue: r.cashValue ? Number(r.cashValue) : null })));
});

export const POST = route(async (req: Request) => {
  await requireManager();
  const parsed = rewardSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const d = parsed.data;

  const reward = await prisma.reward.create({
    data: {
      name: d.name,
      description: d.description || null,
      type: d.type,
      pointCost: d.pointCost,
      cashValue: d.cashValue ?? null,
      stock: d.stock ?? null,
      isActive: d.isActive ?? true,
    },
  });
  return json(reward, { status: 201 });
});
