import { prisma } from "@/lib/prisma";
import { json, route } from "@/lib/http";
import { requirePortalSession } from "@/lib/services/portal/auth";
import { recomputePoints, pointBalance, isPointsEnabled } from "@/lib/services/points/service";
import { explainRates } from "@/lib/services/points/compute";
import { resolveReceiptPeriod } from "@/lib/services/attendance/period";

type Ctx = { params: Promise<{ token: string }> };

/**
 * PORTAL (butuh PIN) — poin karyawan pada satu periode + saldo keseluruhan.
 * Poin periode ini dihitung ulang saat dibuka agar selalu mengikuti data terbaru.
 */
export const GET = route<Ctx>(async (req, ctx) => {
  const { token } = await ctx.params;
  const employee = await requirePortalSession(token);

  if (!(await isPointsEnabled())) return json({ enabled: false });

  const period = resolveReceiptPeriod(new URL(req.url).searchParams);
  const result = await recomputePoints(
    prisma,
    { id: employee.id, posproUserId: employee.posproUserId },
    period.startStr,
    period.endStr
  );
  const balance = await pointBalance(prisma, employee.id);

  return json({
    enabled: true,
    period: { label: period.label, startStr: period.startStr, endStr: period.endStr },
    breakdown: result.breakdown,
    days: result.days.filter((d) => d.points > 0),
    balance,
    howTo: explainRates(result.rates),
  });
});
