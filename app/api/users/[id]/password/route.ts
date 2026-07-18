import { prisma } from "@/lib/prisma";
import { requireAdmin, json, notFound, route } from "@/lib/http";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({ password: z.string().min(8, "Password minimal 8 karakter") });

/** Reset password user (ADMIN/OWNER). */
export const POST = route<Ctx>(async (req, ctx) => {
  await requireAdmin();
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Data tidak valid" }, { status: 422 });

  const target = await prisma.user.findUnique({ where: { id: Number(id) } });
  if (!target) return notFound("User tidak ditemukan");

  const hashed = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.update({ where: { id: Number(id) }, data: { password: hashed } });
  return json({ ok: true });
});
