import { prisma } from "@/lib/prisma";
import { requireSession, json, badRequest, route } from "@/lib/http";
import { workScheduleSchema } from "@/lib/validators/master";

function toData(d: ReturnType<typeof workScheduleSchema.parse>) {
  return {
    name: d.name,
    startTime: d.startTime || null,
    endTime: d.endTime || null,
    breakStartTime: d.breakStartTime || null,
    breakEndTime: d.breakEndTime || null,
    lateToleranceMinutes: d.lateToleranceMinutes,
    dailyWage: d.dailyWage,
    weeklyWage: d.weeklyWage,
    monthlyWage: d.monthlyWage,
    holidayWage: d.holidayWage,
    overtimeWagePerHour: d.overtimeWagePerHour,
    isHoliday: d.isHoliday,
  };
}

export const GET = route(async () => {
  await requireSession();
  const data = await prisma.workSchedule.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
  });
  return json(data);
});

export const POST = route(async (req: Request) => {
  await requireSession();
  const body = await req.json().catch(() => null);
  const parsed = workScheduleSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const ws = await prisma.workSchedule.create({ data: toData(parsed.data) });
  return json(ws, { status: 201 });
});
