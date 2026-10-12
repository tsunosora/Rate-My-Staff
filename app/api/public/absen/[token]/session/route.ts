import { route } from "@/lib/http";
import { bukaSesiPortal, tutupSesiPortal } from "@/lib/services/portal/sesi-pin";

type Ctx = { params: Promise<{ token: string }> };

// Sesi PIN untuk halaman absen HP. Aturannya SAMA dengan portal (satu PIN, satu cookie) —
// rute terpisah cuma supaya gerbang lisensinya hr.absen_hp, bukan hr.portal: klien paket
// Absensi yang membeli add-on ini tidak punya portal Kinerja.
export const POST = route<Ctx>(async (req, ctx) => bukaSesiPortal(req, (await ctx.params).token));

export const DELETE = route<Ctx>(async (_req, ctx) => {
  await ctx.params;
  return tutupSesiPortal();
});
