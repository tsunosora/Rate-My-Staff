import { json, route } from "@/lib/http";
import { requireIntegrationKey } from "@/lib/services/integrations/guard";
import { ringkasanHr } from "@/lib/services/integrations/hr-summary";

/**
 * RINGKASAN HR SEKILAS — untuk kartu di aplikasi lain (PosPro). Isinya di
 * lib/services/integrations/hr-summary.ts (dipakai juga aplikasi HP Owner).
 *
 * Dipanggil server-ke-server dengan header `x-api-key` atau tiket integrasi (lihat
 * lib/services/integrations/guard.ts).
 */
export const GET = route(async (req: Request) => {
  await requireIntegrationKey(req);
  return json(await ringkasanHr());
});
