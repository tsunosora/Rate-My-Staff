import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { json, notFound, route } from "@/lib/http";
import { requirePortalOwner } from "@/lib/services/portal/auth";
import { bolehDibatalkanKaryawan } from "@/lib/services/reimbursement/aturan";
import { hapusFoto } from "@/lib/services/reimbursement/simpan";

type Ctx = { params: Promise<{ token: string; id: string }> };

/** PORTAL — karyawan membatalkan klaimnya sendiri selama masih menunggu (baris + foto dihapus). */
export const DELETE = route<Ctx>(async (req, ctx) => {
  const { token, id } = await ctx.params;
  const employee = await requirePortalOwner(token, req);
  const klaim = await prisma.reimbursement.findFirst({ where: { id: Number(id) || 0, employeeId: employee.id } });
  if (!klaim) return notFound("Klaim tidak ditemukan.");
  if (!bolehDibatalkanKaryawan(klaim.status)) {
    return NextResponse.json({ message: "Klaim sudah diputuskan owner, tidak bisa dibatalkan." }, { status: 409 });
  }
  // deleteMany bersyarat status supaya keputusan owner yang datang bersamaan tidak terhapus.
  const res = await prisma.reimbursement.deleteMany({ where: { id: klaim.id, status: "menunggu" } });
  if (res.count === 0) {
    return NextResponse.json({ message: "Klaim sudah diputuskan owner, tidak bisa dibatalkan." }, { status: 409 });
  }
  await hapusFoto(klaim.fotoPath);
  return json({ ok: true });
});
