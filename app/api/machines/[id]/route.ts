import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, notFound, route } from "@/lib/http";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({ name: z.string().trim().min(1).max(100) });

/** Ubah nama mesin (mis. beri label cabang: "Pusat", "Cabang Bantul"). */
export const PATCH = route<Ctx>(async (req, ctx) => {
  await requireManager();
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const existing = await prisma.machine.findUnique({ where: { id: Number(id) } });
  if (!existing) return notFound("Mesin tidak ditemukan");
  const m = await prisma.machine.update({ where: { id: Number(id) }, data: { name: parsed.data.name } });
  return json({ id: m.id, sn: m.sn, name: m.name });
});
