import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { json, badRequest, notFound, route } from "@/lib/http";
import { requirePortalOwner } from "@/lib/services/portal/auth";
import { toYmd } from "@/lib/services/leave/service";
import { timesheetSchema } from "@/lib/validators/timesheet";
import { BATAS_MUNDUR_HARI, masihBisaDiubah } from "@/lib/services/timesheet/aturan";
import { serializeEntri, simpanEntri } from "@/lib/services/timesheet/service";

type Ctx = { params: Promise<{ token: string; id: string }> };

/**
 * Entri milik karyawan ini yang masih boleh diubahnya: dalam 14 hari dan bukan catatan
 * yang dibuat owner (yang itu milik owner untuk dirapikan).
 */
async function entriMilik(employeeId: number, id: string) {
  const entri = await prisma.timesheetEntri.findFirst({ where: { id: Number(id) || 0, employeeId } });
  if (!entri) return { ok: false as const, res: notFound("Catatan tidak ditemukan") };
  if (entri.sumber === "admin") {
    return {
      ok: false as const,
      res: NextResponse.json(
        { message: "Catatan ini dibuat owner — minta owner untuk mengubahnya." },
        { status: 409 }
      ),
    };
  }
  if (!masihBisaDiubah(toYmd(entri.tanggal), toYmd(new Date()))) {
    return {
      ok: false as const,
      res: NextResponse.json(
        { message: `Catatan lebih dari ${BATAS_MUNDUR_HARI} hari tidak bisa diubah lagi.` },
        { status: 409 }
      ),
    };
  }
  return { ok: true as const, entri };
}

/** PORTAL (butuh PIN) — sunting catatan sendiri. */
export const PATCH = route<Ctx>(async (req, ctx) => {
  const { token, id } = await ctx.params;
  const employee = await requirePortalOwner(token, req);
  const cek = await entriMilik(employee.id, id);
  if (!cek.ok) return cek.res;

  const parsed = timesheetSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const hasil = await simpanEntri(prisma, {
    employeeId: employee.id,
    input: parsed.data,
    id: cek.entri.id,
    sumber: "portal",
  });
  if (!hasil.ok) return NextResponse.json({ message: hasil.message }, { status: hasil.status });
  return json(serializeEntri(hasil.entri));
});

/** PORTAL (butuh PIN) — hapus catatan sendiri. */
export const DELETE = route<Ctx>(async (req, ctx) => {
  const { token, id } = await ctx.params;
  const employee = await requirePortalOwner(token, req);
  const cek = await entriMilik(employee.id, id);
  if (!cek.ok) return cek.res;

  await prisma.timesheetEntri.delete({ where: { id: cek.entri.id } });
  return json({ ok: true });
});
