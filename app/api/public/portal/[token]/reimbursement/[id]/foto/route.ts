import { prisma } from "@/lib/prisma";
import { notFound, route } from "@/lib/http";
import { requirePortalSession } from "@/lib/services/portal/auth";
import { bacaFoto, responsFoto } from "@/lib/services/reimbursement/simpan";

type Ctx = { params: Promise<{ token: string; id: string }> };

/** PORTAL — foto nota milik karyawan ini sendiri (dicocokkan ke employeeId, bukan cuma id). */
export const GET = route<Ctx>(async (req, ctx) => {
  const { token, id } = await ctx.params;
  const employee = await requirePortalSession(token, req);
  const klaim = await prisma.reimbursement.findFirst({
    where: { id: Number(id) || 0, employeeId: employee.id },
    select: { fotoPath: true },
  });
  const f = klaim?.fotoPath ? await bacaFoto(klaim.fotoPath) : null;
  if (!f) return notFound("Foto tidak ditemukan.");
  return responsFoto(f);
});
