import { prisma } from "@/lib/prisma";
import { json, notFound, route } from "@/lib/http";

type Ctx = { params: Promise<{ token: string }> };

// PUBLIK (tanpa auth) — validasi token & kembalikan info karyawan untuk form rating.
export const GET = route<Ctx>(async (_req, ctx) => {
  const { token } = await ctx.params;
  const employee = await prisma.employee.findFirst({
    where: { publicToken: token, deletedAt: null, isActive: true },
    include: { position: true, department: true },
  });
  if (!employee) return notFound("Karyawan tidak ditemukan atau tautan tidak valid");
  return json({
    id: employee.id,
    fullName: employee.fullName,
    nickname: employee.nickname,
    position: employee.position?.name ?? null,
    department: employee.department?.name ?? null,
    photoPath: employee.photoPath,
  });
});
