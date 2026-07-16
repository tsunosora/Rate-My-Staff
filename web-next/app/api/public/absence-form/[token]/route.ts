import { prisma } from "@/lib/prisma";
import { json, badRequest, route } from "@/lib/http";
import { NextResponse } from "next/server";
import { publicAbsenceSchema } from "@/lib/validators/public";

type Ctx = { params: Promise<{ token: string }> };

async function validLink(token: string) {
  return prisma.leaveLink.findFirst({ where: { token, expiresAt: { gt: new Date() } } });
}

// PUBLIK — validasi token & daftar karyawan untuk form ketidakhadiran.
export const GET = route<Ctx>(async (_req, ctx) => {
  const { token } = await ctx.params;
  const link = await validLink(token);
  if (!link) {
    return NextResponse.json({ message: "Tautan kadaluarsa atau tidak valid", expired: true }, { status: 410 });
  }
  const employees = await prisma.employee.findMany({
    where: { deletedAt: null, isActive: true },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });
  return json({ employees, expiresAt: link.expiresAt });
});

// PUBLIK — simpan laporan ketidakhadiran sebagai Attendance (scanType 'absence').
export const POST = route<Ctx>(async (req, ctx) => {
  const { token } = await ctx.params;
  const link = await validLink(token);
  if (!link) {
    return NextResponse.json({ message: "Tautan kadaluarsa atau tidak valid", expired: true }, { status: 410 });
  }
  const body = await req.json().catch(() => null);
  const parsed = publicAbsenceSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const { employeeId, date, status, reason } = parsed.data;

  const employee = await prisma.employee.findFirst({ where: { id: employeeId, deletedAt: null } });
  if (!employee) return badRequest({ employeeId: ["Karyawan tidak ditemukan"] });

  const start = new Date(`${date}T00:00:00`);
  const end = new Date(start.getTime() + 86400000);
  await prisma.attendance.deleteMany({
    where: { employeeId, scanDate: { gte: start, lt: end } },
  });
  await prisma.attendance.create({
    data: {
      employeeId,
      scanDate: new Date(`${date}T00:00:00`),
      scanType: "absence",
      status,
      absenceReason: reason,
    },
  });

  return json({ ok: true }, { status: 201 });
});
