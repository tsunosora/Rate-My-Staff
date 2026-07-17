import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireSession, json, badRequest, notFound, route } from "@/lib/http";
import { positionSchema } from "@/lib/validators/master";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = route<Ctx>(async (req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = positionSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const existing = await prisma.position.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Position not found");
  const pos = await prisma.position.update({
    where: { id: Number(id) },
    data: { name: parsed.data.name, departmentId: parsed.data.departmentId || null },
  });
  return json(pos);
});

export const DELETE = route<Ctx>(async (_req, ctx) => {
  await requireSession();
  const { id } = await ctx.params;
  const count = await prisma.employee.count({
    where: { positionId: Number(id), deletedAt: null },
  });
  if (count > 0) {
    return NextResponse.json(
      { message: `Tidak bisa dihapus: masih ada ${count} karyawan di posisi ini.` },
      { status: 409 }
    );
  }
  await prisma.position.delete({ where: { id: Number(id) } });
  return json({ ok: true });
});
