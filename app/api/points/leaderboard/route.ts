import { prisma } from "@/lib/prisma";
import { requireManager, json, route } from "@/lib/http";
import { pointLeaderboard, recomputePoints, isPointsEnabled } from "@/lib/services/points/service";
import { resolveReceiptPeriod } from "@/lib/services/attendance/period";

/**
 * Papan peringkat poin. `recalc=1` menghitung ulang seluruh karyawan lebih dulu —
 * dipakai tombol "Hitung ulang" di halaman owner.
 */
export const GET = route(async (req: Request) => {
  await requireManager();
  if (!(await isPointsEnabled())) return json({ enabled: false, rows: [] });

  const sp = new URL(req.url).searchParams;
  const period = resolveReceiptPeriod(sp);

  if (sp.get("recalc") === "1") {
    const employees = await prisma.employee.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, posproUserId: true },
    });
    for (const e of employees) {
      await recomputePoints(prisma, e, period.startStr, period.endStr);
    }
  }

  return json({
    enabled: true,
    period: { label: period.label, startStr: period.startStr, endStr: period.endStr },
    rows: await pointLeaderboard(prisma, period.startStr, period.endStr),
  });
});
