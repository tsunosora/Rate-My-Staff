import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, notFound, route } from "@/lib/http";
import { NextResponse } from "next/server";
import { departmentSchema } from "@/lib/validators/master";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = route<Ctx>(async (req, ctx) => {
  await requireManager();
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = departmentSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const existing = await prisma.department.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Department not found");
  const dept = await prisma.department.update({
    where: { id: Number(id) },
    data: { name: parsed.data.name },
  });
  return json(dept);
});

export const DELETE = route<Ctx>(async (_req, ctx) => {
  await requireManager();
  const { id } = await ctx.params;
  const count = await prisma.employee.count({
    where: { departmentId: Number(id), deletedAt: null },
  });
  if (count > 0) {
    return NextResponse.json(
      { message: `Tidak bisa dihapus: masih ada ${count} karyawan di departemen ini.` },
      { status: 409 }
    );
  }
  await prisma.department.delete({ where: { id: Number(id) } });
  return json({ ok: true });
});
