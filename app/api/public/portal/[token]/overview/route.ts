import { prisma } from "@/lib/prisma";
import { json, route } from "@/lib/http";
import { requirePortalSession } from "@/lib/services/portal/auth";
import { buildPortalOverview } from "@/lib/services/portal/overview";
import { resolveReceiptPeriod } from "@/lib/services/attendance/period";

type Ctx = { params: Promise<{ token: string }> };

/** PORTAL (butuh PIN) — absensi, struk lembur, penilaian & feedback satu periode. */
export const GET = route<Ctx>(async (req, ctx) => {
  const { token } = await ctx.params;
  const employee = await requirePortalSession(token);
  const period = resolveReceiptPeriod(new URL(req.url).searchParams);
  return json(await buildPortalOverview(prisma, employee.id, period));
});
