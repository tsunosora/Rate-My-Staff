import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, notFound, route } from "@/lib/http";
import { timesheetSchema } from "@/lib/validators/timesheet";
import { serializeEntri, simpanEntri } from "@/lib/services/timesheet/service";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Owner menyunting satu catatan (milik siapa pun, tanpa batas 14 hari). Karyawannya tidak
 * bisa dipindah — hapus lalu buat ulang kalau salah orang. `sumber` asal dipertahankan.
 */
export const PATCH = route<Ctx>(async (req, ctx) => {
  await requireManager();
  const { id } = await ctx.params;
  const entri = await prisma.timesheetEntri.findUnique({ where: { id: Number(id) || 0 } });
  if (!entri) return notFound("Catatan tidak ditemukan");

  const parsed = timesheetSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const hasil = await simpanEntri(prisma, {
    employeeId: entri.employeeId,
    input: parsed.data,
    id: entri.id,
    sumber: "admin",
    tanpaBatasMundur: true,
  });
  if (!hasil.ok) return NextResponse.json({ message: hasil.message }, { status: hasil.status });
  return json(serializeEntri(hasil.entri));
});

export const DELETE = route<Ctx>(async (_req, ctx) => {
  await requireManager();
  const { id } = await ctx.params;
  const entri = await prisma.timesheetEntri.findUnique({ where: { id: Number(id) || 0 } });
  if (!entri) return notFound("Catatan tidak ditemukan");
  await prisma.timesheetEntri.delete({ where: { id: entri.id } });
  return json({ ok: true });
});
