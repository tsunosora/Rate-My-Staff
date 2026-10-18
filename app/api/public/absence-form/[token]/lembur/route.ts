import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { json, badRequest, route } from "@/lib/http";
import { lemburPublikSchema } from "@/lib/validators/lembur";
import { MAKS_MUNDUR_KARYAWAN } from "@/lib/services/lembur/aturan";
import { buatPengajuan } from "@/lib/services/lembur/service";

type Ctx = { params: Promise<{ token: string }> };

/**
 * PUBLIK — ajukan lembur lewat tautan form ketidakhadiran (paket tanpa portal karyawan).
 * Tautannya sama dengan form izin (LeaveLink, berbatas waktu); karyawan memilih namanya.
 * Masuk sebagai `pending`, menunggu owner di halaman Lembur.
 */
export const POST = route<Ctx>(async (req, ctx) => {
  const { token } = await ctx.params;
  const link = await prisma.leaveLink.findFirst({ where: { token, expiresAt: { gt: new Date() } } });
  if (!link) {
    return NextResponse.json(
      { message: "Tautan kadaluarsa atau tidak valid", expired: true },
      { status: 410 }
    );
  }

  const parsed = lemburPublikSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const employee = await prisma.employee.findFirst({
    where: { id: parsed.data.employeeId, deletedAt: null, isActive: true },
    select: { id: true, fullName: true },
  });
  if (!employee) return badRequest({ employeeId: ["Karyawan tidak ditemukan"] });

  const hasil = await buatPengajuan(prisma, {
    employee,
    input: parsed.data,
    sumber: "link",
    maksMundur: MAKS_MUNDUR_KARYAWAN,
  });
  if (!hasil.ok) {
    if (hasil.status === 422) return badRequest({ [hasil.field ?? "form"]: [hasil.message] });
    return NextResponse.json({ message: hasil.message }, { status: hasil.status });
  }
  return json({ ok: true, status: "pending" }, { status: 201 });
});
