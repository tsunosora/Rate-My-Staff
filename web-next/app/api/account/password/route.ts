import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSession, json, badRequest, route } from "@/lib/http";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, "Password baru minimal 6 karakter"),
});

export const POST = route(async (req: Request) => {
  const session = await requireSession();
  const email = session.user?.email;
  if (!email) return NextResponse.json({ message: "Sesi tidak valid" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ message: "User tidak ditemukan" }, { status: 404 });

  const ok = await bcrypt.compare(parsed.data.currentPassword, user.password);
  if (!ok) return NextResponse.json({ message: "Password saat ini salah" }, { status: 400 });

  const hash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { password: hash } });

  return json({ ok: true });
});
