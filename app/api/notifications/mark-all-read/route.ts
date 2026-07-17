import { prisma } from "@/lib/prisma";
import { requireSession, json, route } from "@/lib/http";

export const POST = route(async () => {
  const session = await requireSession();
  const email = session.user?.email;
  if (email) {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (user) {
      await prisma.notification.updateMany({
        where: { userId: user.id, readAt: null },
        data: { readAt: new Date() },
      });
    }
  }
  return json({ ok: true });
});
