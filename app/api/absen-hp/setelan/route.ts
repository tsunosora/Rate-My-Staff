import { requireManager, json, badRequest, route } from "@/lib/http";
import { getSetting, setSetting } from "@/lib/settings";
import { SETELAN_LUAR, luarDiizinkan } from "@/lib/services/absen-hp/aturan";
import { setelanAbsenHpSchema } from "@/lib/services/absen-hp/skema";

/** Setelan absen lewat HP yang berlaku untuk semua karyawan. */
export const GET = route(async () => {
  await requireManager();
  return json({ luarLokasi: luarDiizinkan(await getSetting(SETELAN_LUAR)) });
});

export const PATCH = route(async (req) => {
  await requireManager();
  const parsed = setelanAbsenHpSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  await setSetting(SETELAN_LUAR, parsed.data.luarLokasi ? "true" : "false");
  return json({ luarLokasi: parsed.data.luarLokasi });
});
