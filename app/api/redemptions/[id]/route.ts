import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, notFound, route } from "@/lib/http";
import { redemptionDecisionSchema } from "@/lib/validators/points";
import { pointBalance } from "@/lib/services/points/service";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Keputusan owner atas pengajuan tukar poin.
 * - approve : poin terpotong (lewat status), stok hadiah berkurang.
 * - reject  : poin kembali tersedia, stok tidak tersentuh.
 * - deliver : tandai hadiah sudah diserahkan (poin tetap terpotong).
 * - cancel  : batalkan persetujuan; poin kembali & stok dikembalikan.
 */
export const PATCH = route<Ctx>(async (req, ctx) => {
  const session = await requireManager();
  const { id } = await ctx.params;

  const parsed = redemptionDecisionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const { action, note } = parsed.data;

  const r = await prisma.pointRedemption.findUnique({ where: { id: Number(id) } });
  if (!r) return notFound("Pengajuan tidak ditemukan");

  const allowed: Record<string, string[]> = {
    approve: ["pending"],
    reject: ["pending"],
    deliver: ["approved"],
    cancel: ["pending", "approved"],
  };
  if (!allowed[action].includes(r.status)) {
    return NextResponse.json(
      { message: `Tidak bisa "${action}" untuk pengajuan berstatus "${r.status}".` },
      { status: 409 }
    );
  }

  // Poin bisa saja sudah terpakai pengajuan lain sejak diajukan.
  if (action === "approve") {
    const balance = await pointBalance(prisma, r.employeeId);
    const availableForThis = balance.available + r.pointCost; // pengajuan ini masih ditahan
    if (availableForThis < r.pointCost) {
      return NextResponse.json({ message: "Poin karyawan tidak lagi mencukupi." }, { status: 409 });
    }
  }

  const decider = session.user?.email
    ? await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
    : null;

  const status =
    action === "approve" ? "approved" :
    action === "reject" ? "rejected" :
    action === "deliver" ? "delivered" : "cancelled";

  const updated = await prisma.pointRedemption.update({
    where: { id: r.id },
    data: {
      status,
      decisionNote: note?.trim() || null,
      decidedById: decider?.id ?? null,
      decidedAt: new Date(),
    },
  });

  // Stok: berkurang saat disetujui, kembali saat persetujuan dibatalkan.
  if (r.rewardId) {
    if (action === "approve") {
      await prisma.reward.updateMany({
        where: { id: r.rewardId, stock: { not: null } },
        data: { stock: { decrement: 1 } },
      });
    } else if (action === "cancel" && r.status === "approved") {
      await prisma.reward.updateMany({
        where: { id: r.rewardId, stock: { not: null } },
        data: { stock: { increment: 1 } },
      });
    }
  }

  return json({ ok: true, status: updated.status });
});
