import { prisma } from "@/lib/prisma";
import { json, badRequest, route } from "@/lib/http";
import { NextResponse } from "next/server";
import { notifyManagers } from "@/lib/notify";
import { publicLeaveRequestSchema } from "@/lib/validators/portal";
import { validateLeaveRange } from "@/lib/services/leave/range";
import {
  atMidnight,
  toYmd,
  findOverlapping,
  leaveNotificationData,
} from "@/lib/services/leave/service";

type Ctx = { params: Promise<{ token: string }> };

async function validLink(token: string) {
  return prisma.leaveLink.findFirst({ where: { token, expiresAt: { gt: new Date() } } });
}

function expiredResponse() {
  return NextResponse.json(
    { message: "Tautan kadaluarsa atau tidak valid", expired: true },
    { status: 410 }
  );
}

// PUBLIK — validasi token & daftar karyawan untuk form ketidakhadiran.
export const GET = route<Ctx>(async (_req, ctx) => {
  const { token } = await ctx.params;
  const link = await validLink(token);
  if (!link) return expiredResponse();
  const employees = await prisma.employee.findMany({
    where: { deletedAt: null, isActive: true },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });
  return json({ employees, expiresAt: link.expiresAt });
});

/**
 * PUBLIK — kirim pengajuan ketidakhadiran. Sejak versi approval, ini TIDAK lagi
 * langsung menulis ke absensi: pengajuan masuk sebagai `pending` dan baru tercatat
 * setelah owner/manajemen menyetujuinya di halaman Izin & Cuti.
 */
export const POST = route<Ctx>(async (req, ctx) => {
  const { token } = await ctx.params;
  const link = await validLink(token);
  if (!link) return expiredResponse();

  const body = await req.json().catch(() => null);
  // Form lama mengirim { date, status }; skema baru { startDate, endDate, type }.
  const normalized =
    body && typeof body === "object"
      ? {
          ...body,
          startDate: (body as Record<string, unknown>).startDate ?? (body as Record<string, unknown>).date,
          type: (body as Record<string, unknown>).type ?? (body as Record<string, unknown>).status,
        }
      : body;

  const parsed = publicLeaveRequestSchema.safeParse(normalized);
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const { employeeId, type, reason } = parsed.data;
  const startStr = parsed.data.startDate;
  const endStr = parsed.data.endDate || startStr;

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, deletedAt: null, isActive: true },
    select: { id: true, fullName: true },
  });
  if (!employee) return badRequest({ employeeId: ["Karyawan tidak ditemukan"] });

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
      source: "link",
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

  return json({ ok: true, status: "pending" }, { status: 201 });
});
