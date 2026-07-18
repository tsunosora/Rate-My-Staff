import { requireSession, requireManager, json, badRequest, route } from "@/lib/http";
import { getAllSettings, setSettings } from "@/lib/settings";
import { z } from "zod";

const settingsSchema = z.record(z.string(), z.string().nullable());

export const GET = route(async () => {
  await requireSession();
  return json(await getAllSettings());
});

export const PUT = route(async (req: Request) => {
  await requireManager();
  const body = await req.json().catch(() => null);
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());
  await setSettings(parsed.data);
  return json(await getAllSettings());
});
