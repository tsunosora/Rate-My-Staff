import { prisma } from "@/lib/prisma";
import { requireAdmin, json, route } from "@/lib/http";
import bcrypt from "bcryptjs";
import { z } from "zod";

/** Kembalikan pesan error pertama dari hasil validasi zod. */
function firstError(err: z.ZodError): string {
  return err.issues[0]?.message ?? "Data tidak valid";
}

const ROLES = ["OWNER", "ADMIN", "HR", "EVALUATOR"] as const;

const createSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi"),
  email: z.string().trim().toLowerCase().email("Email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
  role: z.enum(ROLES),
});

const SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
} as const;

export const GET = route(async () => {
  await requireAdmin();
  const users = await prisma.user.findMany({ select: SELECT, orderBy: { createdAt: "asc" } });
  return json(users);
});

export const POST = route(async (req) => {
  await requireAdmin();
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return json({ message: firstError(parsed.error) }, { status: 422 });

  const { name, email, password, role } = parsed.data;
  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return json({ message: "Email sudah dipakai" }, { status: 422 });

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role },
    select: SELECT,
  });
  return json(user, { status: 201 });
});
