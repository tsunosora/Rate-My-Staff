import { prisma } from "@/lib/prisma";
import { json, route } from "@/lib/http";
import { requirePortalSession } from "@/lib/services/portal/auth";
import { recomputePoints, pointBalance, isPointsEnabled } from "@/lib/services/points/service";
import { explainRatesByRole, type PointRole } from "@/lib/services/points/compute";
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

  // Peran ditentukan dari apa yang ORANGNYA benar-benar kerjakan, bukan dari jabatan
  // tertulis — supaya orang yang merangkap tetap melihat semua aturan yang relevan.
  const roles: PointRole[] = ["semua"];
  const sum = (pick: (d: (typeof result.days)[number]) => number) =>
    result.days.reduce((a, d) => a + pick(d), 0);
  if (sum((d) => d.transactions) > 0) roles.unshift("kasir");
  if (sum((d) => d.designJobs) > 0 || sum((d) => d.designServiceValue) > 0) roles.unshift("desainer");
  if (sum((d) => d.operatorJobs) > 0) roles.unshift("operator");

  return json({
    enabled: true,
    period: { label: period.label, startStr: period.startStr, endStr: period.endStr },
    breakdown: result.breakdown,
    days: result.days.filter((d) => d.points > 0),
    balance,
    roles,
    howTo: explainRatesByRole(result.rates),
  });
});
