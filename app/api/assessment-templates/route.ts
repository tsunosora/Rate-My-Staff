import { prisma } from "@/lib/prisma";
import { requireSession, requireManager, json, badRequest, route } from "@/lib/http";
import { templateSchema } from "@/lib/validators/assessment";

export const GET = route(async () => {
  await requireSession();
  const data = await prisma.assessmentTemplate.findMany({
    orderBy: { name: "asc" },
    include: {
      indicators: { orderBy: { sortOrder: "asc" } },
      _count: { select: { assessments: true } },
    },
  });
  return json(data);
});

export const POST = route(async (req: Request) => {
  await requireManager();
  const body = await req.json().catch(() => null);
  const parsed = templateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const tpl = await prisma.assessmentTemplate.create({ data: parsed.data });
  return json(tpl, { status: 201 });
});
