import { prisma } from "@/lib/prisma";
import { requireSession, json, route } from "@/lib/http";

export const GET = route(async (req: Request) => {
  await requireSession();
  const sp = new URL(req.url).searchParams;
  const dateStr = sp.get("date") ?? new Date().toISOString().slice(0, 10);
  const start = new Date(`${dateStr}T00:00:00`);
  const end = new Date(start.getTime() + 86400000);

  const rows = await prisma.attendance.findMany({
    where: { scanDate: { gte: start, lt: end } },
    include: { employee: { select: { fullName: true } } },
    orderBy: { scanDate: "asc" },
  });

  const present = new Set(rows.filter((r) => r.scanType !== "absence").map((r) => r.employeeId)).size;
  const lateEmployees = new Set(
    rows.filter((r) => r.status === "late").map((r) => r.employeeId)
  );
  const late = lateEmployees.size;
  const absent = new Set(
    rows.filter((r) => r.scanType === "absence").map((r) => r.employeeId)
  ).size;
  const recentLates = rows
    .filter((r) => r.status === "late" && r.scanType === "in")
    .slice(0, 5)
    .map((r) => ({ name: r.employee.fullName, minutes: r.lateMinutes }));

  return json({ present, late, absent, recentLates });
});
