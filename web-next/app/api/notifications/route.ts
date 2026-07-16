import { prisma } from "@/lib/prisma";
import { requireSession, json, route } from "@/lib/http";

async function currentUserId(email?: string | null): Promise<number | null> {
  if (!email) return null;
  const u = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return u?.id ?? null;
}

export const GET = route(async () => {
  const session = await requireSession();
  const userId = await currentUserId(session.user?.email);
  if (!userId) return json({ items: [], unread: 0 });

  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  return json({ items, unread });
});
