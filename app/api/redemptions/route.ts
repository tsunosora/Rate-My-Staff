import type { Prisma, RedemptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireManager, json, route } from "@/lib/http";

const STATUSES = new Set(["pending", "approved", "rejected", "delivered", "cancelled"]);

/** Daftar pengajuan tukar poin untuk owner/manajemen. */
export const GET = route(async (req: Request) => {
  await requireManager();
  const sp = new URL(req.url).searchParams;
  const status = sp.get("status");

  const where: Prisma.PointRedemptionWhereInput =
    status && STATUSES.has(status) ? { status: status as RedemptionStatus } : {};

  const [items, pending] = await Promise.all([
    prisma.pointRedemption.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 50,
      include: {
        employee: { select: { id: true, fullName: true, employeeCode: true } },
        decidedBy: { select: { name: true } },
      },
    }),
    prisma.pointRedemption.count({ where: { status: "pending" } }),
  ]);

  return json({
    items: items.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      employeeName: r.employee.fullName,
      employeeCode: r.employee.employeeCode,
      rewardName: r.rewardName,
      pointCost: r.pointCost,
      status: r.status,
      note: r.note,
      decisionNote: r.decisionNote,
      decidedBy: r.decidedBy?.name ?? null,
      decidedAt: r.decidedAt,
      createdAt: r.createdAt,
    })),
    pending,
  });
});
