import { prisma } from "@/lib/prisma";
import { requireAdmin, json, notFound, route } from "@/lib/http";
import { NextResponse } from "next/server";
import { z } from "zod";

const bad = (message: string, status = 422) => NextResponse.json({ message }, { status });

type Ctx = { params: Promise<{ id: string }> };

const ROLES = ["OWNER", "ADMIN", "HR", "EVALUATOR"] as const;
const ADMIN_ROLES = new Set(["OWNER", "ADMIN"]);

const patchSchema = z.object({
  name: z.string().trim().min(1).optional(),
  role: z.enum(ROLES).optional(),
  isActive: z.boolean().optional(),
});

const SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
} as const;

export const PATCH = route<Ctx>(async (req, ctx) => {
  const session = await requireAdmin();
  const { id } = await ctx.params;
  const userId = Number(id);

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Data tidak valid");
  const { name, role, isActive } = parsed.data;

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return notFound("User tidak ditemukan");

  const isSelf = target.email === session.user?.email;
  if (isSelf && role && role !== target.role)
    return bad("Tidak bisa mengubah peran akun sendiri");
  if (isSelf && isActive === false)
    return bad("Tidak bisa menonaktifkan akun sendiri");

  // Jaga: minimal satu admin/owner aktif harus tetap ada.
  const willLoseAdmin =
    ADMIN_ROLES.has(target.role) &&
    ((role != null && !ADMIN_ROLES.has(role)) || isActive === false);
  if (willLoseAdmin) {
    const otherAdmins = await prisma.user.count({
      where: { id: { not: userId }, isActive: true, role: { in: ["OWNER", "ADMIN"] } },
    });
    if (otherAdmins === 0)
      return NextResponse.json(
        { message: "Minimal harus ada satu Admin/Owner yang aktif." },
        { status: 409 }
      );
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name != null ? { name } : {}),
      ...(role != null ? { role } : {}),
      ...(isActive != null ? { isActive } : {}),
    },
    select: SELECT,
  });
  return json(user);
});
