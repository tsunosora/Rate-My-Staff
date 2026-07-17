import { prisma } from "@/lib/prisma";
import { requireSession, json, badRequest, route } from "@/lib/http";
import { holidaySchema } from "@/lib/validators/master";

export const GET = route(async () => {
  await requireSession();
  const data = await prisma.holiday.findMany({ orderBy: { date: "asc" } });
  return json(data);
});

export const POST = route(async (req: Request) => {
  await requireSession();
  const body = await req.json().catch(() => null);
  const parsed = holidaySchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const holiday = await prisma.holiday.upsert({
    where: { date: new Date(parsed.data.date) },
    update: { name: parsed.data.name },
    create: { date: new Date(parsed.data.date), name: parsed.data.name },
  });
  return json(holiday, { status: 201 });
});
