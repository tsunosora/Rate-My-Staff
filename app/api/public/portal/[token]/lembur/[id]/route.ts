import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { json, notFound, route } from "@/lib/http";
import { requirePortalOwner } from "@/lib/services/portal/auth";

type Ctx = { params: Promise<{ token: string; id: string }> };

/** PORTAL — batalkan pengajuan lembur sendiri selama masih `pending`. */
export const DELETE = route<Ctx>(async (req, ctx) => {
  const { token, id } = await ctx.params;
  const employee = await requirePortalOwner(token, req);
  const p = await prisma.pengajuanLembur.findFirst({
    where: { id: Number(id) || 0, employeeId: employee.id },
  });
  if (!p) return notFound("Pengajuan tidak ditemukan");
  if (p.status !== "pending") {
    return NextResponse.json(
      { message: "Pengajuan yang sudah diputuskan tidak bisa dibatalkan sendiri." },
      { status: 409 }
    );
  }
  await prisma.pengajuanLembur.update({ where: { id: p.id }, data: { status: "cancelled" } });
  return json({ ok: true });
});
