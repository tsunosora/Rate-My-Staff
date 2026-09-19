import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { json, badRequest, route } from "@/lib/http";
import { notifyManagers } from "@/lib/notify";
import { requirePortalSession, requirePortalOwner } from "@/lib/services/portal/auth";
import { leaveRequestSchema } from "@/lib/validators/portal";
import { validateLeaveRange, countDays } from "@/lib/services/leave/range";
import {
  atMidnight,
  toYmd,
  findOverlapping,
  leaveNotificationData,
} from "@/lib/services/leave/service";

type Ctx = { params: Promise<{ token: string }> };

function serialize(r: {
  id: number;
  startDate: Date;
  endDate: Date;
  type: string;
  reason: string;
  status: string;
  decisionNote: string | null;
  decidedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: r.id,
    startDate: toYmd(r.startDate),
    endDate: toYmd(r.endDate),
    days: countDays(toYmd(r.startDate), toYmd(r.endDate)),
    type: r.type,
    reason: r.reason,
    status: r.status,
    decisionNote: r.decisionNote,
    decidedAt: r.decidedAt,
    createdAt: r.createdAt,
  };
}

/** PORTAL (butuh PIN) — riwayat pengajuan izin milik karyawan ini. */
export const GET = route<Ctx>(async (_req, ctx) => {
  const { token } = await ctx.params;
  const employee = await requirePortalSession(token);
  const items = await prisma.leaveRequest.findMany({
    where: { employeeId: employee.id },
    orderBy: [{ startDate: "desc" }, { id: "desc" }],
    take: 30,
  });
  return json({ items: items.map(serialize) });
});

/** PORTAL (butuh PIN) — ajukan izin/sakit/cuti. Masuk sebagai `pending`, menunggu owner. */
export const POST = route<Ctx>(async (req, ctx) => {
  const { token } = await ctx.params;
  const employee = await requirePortalOwner(token);

  const parsed = leaveRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const { type, reason } = parsed.data;
  const startStr = parsed.data.startDate;
  const endStr = parsed.data.endDate || startStr;

  const check = validateLeaveRange(startStr, endStr, toYmd(new Date()));
  if (!check.ok) return badRequest({ startDate: [check.error] });

  const clash = await findOverlapping(prisma, employee.id, startStr, endStr);
  if (clash) {
    return NextResponse.json(
      {
        message: `Sudah ada pengajuan ${clash.type} (${clash.status}) pada ${toYmd(
          clash.startDate
        )}–${toYmd(clash.endDate)}.`,
      },
      { status: 409 }
    );
  }

  const created = await prisma.leaveRequest.create({
    data: {
      employeeId: employee.id,
      startDate: atMidnight(startStr),
      endDate: atMidnight(endStr),
      type,
      reason,
      source: "portal",
    },
  });

  await notifyManagers(
    "leave_request",
    leaveNotificationData({
      leaveRequestId: created.id,
      employeeId: employee.id,
      employeeName: employee.fullName,
      type,
      startStr,
      endStr,
    })
  );

  return json(serialize(created), { status: 201 });
});
