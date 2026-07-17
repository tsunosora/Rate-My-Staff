import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/** Buat notifikasi untuk satu user. */
export async function notifyUser(userId: number, type: string, data: Prisma.InputJsonValue) {
  await prisma.notification.create({ data: { userId, type, data } });
}

/** Buat notifikasi untuk semua user (mis. penilaian selesai). */
export async function notifyAll(type: string, data: Prisma.InputJsonValue) {
  const users = await prisma.user.findMany({ select: { id: true } });
  if (users.length === 0) return;
  await prisma.notification.createMany({
    data: users.map((u) => ({ userId: u.id, type, data: data as Prisma.InputJsonValue })),
  });
}
