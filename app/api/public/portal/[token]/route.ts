import { json, route } from "@/lib/http";
import { keadaanPortal } from "@/lib/services/portal/keadaan";

type Ctx = { params: Promise<{ token: string }> };

/**
 * PUBLIK — keadaan halaman portal: identitas ringkas karyawan, apakah PIN sudah dibuat,
 * dan apakah pengunjung sudah melewati layar PIN. Data sensitif TIDAK ada di sini.
 * Aturannya di lib/services/portal/keadaan.ts (dipakai juga halaman absen HP).
 */
export const GET = route<Ctx>(async (req, ctx) => {
  const { token } = await ctx.params;
  return json((await keadaanPortal(req, token)).publik);
});
