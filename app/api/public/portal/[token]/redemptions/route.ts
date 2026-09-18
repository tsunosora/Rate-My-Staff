import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { json, badRequest, route } from "@/lib/http";
import { notifyManagers } from "@/lib/notify";
import { requirePortalSession } from "@/lib/services/portal/auth";
import { pointBalance, isPointsEnabled } from "@/lib/services/points/service";
import { redemptionCreateSchema } from "@/lib/validators/points";

type Ctx = { params: Promise<{ token: string }> };

/** PORTAL — katalog hadiah + riwayat penukaran milik karyawan ini. */
export const GET = route<Ctx>(async (_req, ctx) => {
  const { token } = await ctx.params;
  const employee = await requirePortalSession(token);
  if (!(await isPointsEnabled())) return json({ enabled: false, rewards: [], items: [] });

  const [rewards, items, balance] = await Promise.all([
    prisma.reward.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { pointCost: "asc" },
      select: { id: true, name: true, description: true, type: true, pointCost: true, cashValue: true, stock: true },
    }),
    prisma.pointRedemption.findMany({
      where: { employeeId: employee.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    pointBalance(prisma, employee.id),
  ]);

  return json({
    enabled: true,
    balance,
    rewards: rewards.map((r) => ({ ...r, cashValue: r.cashValue ? Number(r.cashValue) : null })),
    items,
  });
});

/** PORTAL — ajukan penukaran poin. Poin baru terpotong setelah owner menyetujui. */
export const POST = route<Ctx>(async (req, ctx) => {
  const { token } = await ctx.params;
  const employee = await requirePortalSession(token);
  if (!(await isPointsEnabled())) {
    return NextResponse.json({ message: "Sistem poin sedang dimatikan." }, { status: 409 });
  }

  const parsed = redemptionCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const reward = await prisma.reward.findFirst({
    where: { id: parsed.data.rewardId, isActive: true, deletedAt: null },
  });
  if (!reward) return badRequest({ rewardId: ["Hadiah tidak tersedia."] });
  if (reward.stock !== null && reward.stock <= 0) {
    return NextResponse.json({ message: "Stok hadiah ini habis." }, { status: 409 });
  }

  // Poin tertahan (pending) ikut mengurangi saldo agar tak bisa mengajukan berkali-kali
  // melebihi poin yang dimiliki.
  const balance = await pointBalance(prisma, employee.id);
  if (balance.available < reward.pointCost) {
    return NextResponse.json(
      { message: `Poin belum cukup. Tersedia ${balance.available}, dibutuhkan ${reward.pointCost}.` },
      { status: 409 }
    );
  }

  const created = await prisma.pointRedemption.create({
    data: {
      employeeId: employee.id,
      rewardId: reward.id,
      rewardName: reward.name,
      pointCost: reward.pointCost,
      note: parsed.data.note?.trim() || null,
    },
  });

  await notifyManagers("point_redemption", {
    title: "Pengajuan tukar poin",
    message: `${employee.fullName} — ${reward.name} (${reward.pointCost} poin)`,
    redemptionId: created.id,
    employeeId: employee.id,
  });

  return json(created, { status: 201 });
});
