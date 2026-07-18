import { prisma } from "@/lib/prisma";
import { requireSession, requireManager, json, badRequest, route } from "@/lib/http";
import { overtimeCategorySchema } from "@/lib/validators/master";

export const GET = route(async () => {
  await requireSession();
  const data = await prisma.overtimeCategory.findMany({ orderBy: { name: "asc" } });
  return json(data);
});

export const POST = route(async (req: Request) => {
  await requireManager();
  const body = await req.json().catch(() => null);
  const parsed = overtimeCategorySchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const cat = await prisma.overtimeCategory.create({ data: parsed.data });
  return json(cat, { status: 201 });
});
