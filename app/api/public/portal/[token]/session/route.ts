import { route } from "@/lib/http";
import { bukaSesiPortal, tutupSesiPortal } from "@/lib/services/portal/sesi-pin";

type Ctx = { params: Promise<{ token: string }> };

/** PUBLIK — buka sesi portal (aturannya di lib/services/portal/sesi-pin.ts). */
export const POST = route<Ctx>(async (req, ctx) => bukaSesiPortal(req, (await ctx.params).token));

/** PUBLIK — keluar dari portal (hapus cookie sesi). */
export const DELETE = route<Ctx>(async (_req, ctx) => {
  await ctx.params;
  return tutupSesiPortal();
});
