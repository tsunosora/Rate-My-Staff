import { prisma } from "@/lib/prisma";
import { requireSession, json, route } from "@/lib/http";

// Butuh login (proxy whitelist /api/fingerspot, jadi guard di sini).
export const GET = route(async () => {
  await requireSession();
  const [logs, unprocessed] = await Promise.all([
    prisma.fingerspotRawLog.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.fingerspotRawLog.count({ where: { processed: false } }),
  ]);
  return json({ logs, unprocessed });
});
