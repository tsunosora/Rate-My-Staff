import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireSession, json, route } from "@/lib/http";

// Ambil leave-link aktif (belum kadaluarsa) terbaru.
export const GET = route(async () => {
  await requireSession();
  const link = await prisma.leaveLink.findFirst({
    where: { expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  return json(link);
});

// Buat leave-link baru, berlaku 24 jam.
export const POST = route(async () => {
  await requireSession();
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const link = await prisma.leaveLink.create({ data: { token, expiresAt } });
  return json(link, { status: 201 });
});
