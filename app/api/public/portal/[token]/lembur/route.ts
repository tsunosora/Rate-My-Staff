import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { json, badRequest, route } from "@/lib/http";
import { requirePortalSession, requirePortalOwner } from "@/lib/services/portal/auth";
import { lemburSchema } from "@/lib/validators/lembur";
import { MAKS_MUNDUR_KARYAWAN } from "@/lib/services/lembur/aturan";
import { buatPengajuan, serializeLembur } from "@/lib/services/lembur/service";

type Ctx = { params: Promise<{ token: string }> };

/** PORTAL (butuh PIN) — riwayat pengajuan lembur milik karyawan ini. */
export const GET = route<Ctx>(async (req, ctx) => {
  const { token } = await ctx.params;
  const employee = await requirePortalSession(token, req);
  const items = await prisma.pengajuanLembur.findMany({
    where: { employeeId: employee.id },
    orderBy: [{ tanggal: "desc" }, { id: "desc" }],
    take: 30,
  });
  return json({ items: items.map(serializeLembur), maksMundur: MAKS_MUNDUR_KARYAWAN });
});

/** PORTAL (butuh PIN) — ajukan lembur. Masuk sebagai `pending`, menunggu owner. */
export const POST = route<Ctx>(async (req, ctx) => {
  const { token } = await ctx.params;
  const employee = await requirePortalOwner(token, req);
  const parsed = lemburSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const hasil = await buatPengajuan(prisma, {
    employee,
    input: parsed.data,
    sumber: "portal",
    maksMundur: MAKS_MUNDUR_KARYAWAN,
  });
  if (!hasil.ok) {
    if (hasil.status === 422) return badRequest({ [hasil.field ?? "form"]: [hasil.message] });
    return NextResponse.json({ message: hasil.message }, { status: hasil.status });
  }
  return json(serializeLembur(hasil.pengajuan), { status: 201 });
});
