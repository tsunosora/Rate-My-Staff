import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession, json, route } from "@/lib/http";

const PER_PAGE = 20;

function dayRange(dateStr: string) {
  const start = new Date(`${dateStr}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export const GET = route(async (req: Request) => {
  await requireSession();
  const sp = new URL(req.url).searchParams;
  const dateStr = sp.get("date") ?? new Date().toISOString().slice(0, 10);
  const status = sp.get("status");
  const page = Math.max(1, Number(sp.get("page") ?? 1));
  const { start, end } = dayRange(dateStr);

  const where: Prisma.AttendanceWhereInput = { scanDate: { gte: start, lt: end } };
  if (status && status !== "all") where.status = status;

  const [data, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      orderBy: { scanDate: "asc" },
      include: { employee: { select: { fullName: true, employeeCode: true } } },
    }),
    prisma.attendance.count({ where }),
  ]);

  return json({ data, total, page, perPage: PER_PAGE });
});
