import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { json, notFound, route } from "@/lib/http";
import { requirePortalSession } from "@/lib/services/portal/auth";

type Ctx = { params: Promise<{ token: string; id: string }> };

/** PORTAL (butuh PIN) — batalkan pengajuan sendiri selama masih `pending`. */
export const DELETE = route<Ctx>(async (_req, ctx) => {
  const { token, id } = await ctx.params;
  const employee = await requirePortalSession(token);

  const request = await prisma.leaveRequest.findFirst({
    where: { id: Number(id), employeeId: employee.id },
  });
  if (!request) return notFound("Pengajuan tidak ditemukan");
  if (request.status !== "pending") {
    return NextResponse.json(
      { message: "Pengajuan yang sudah diputuskan tidak bisa dibatalkan sendiri." },
      { status: 409 }
    );
  }

  await prisma.leaveRequest.update({
    where: { id: request.id },
    data: { status: "cancelled" },
  });
  return json({ ok: true });
});
