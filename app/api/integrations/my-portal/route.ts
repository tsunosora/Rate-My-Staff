import { prisma } from "@/lib/prisma";
import { json, route } from "@/lib/http";
import { requireIntegrationKey } from "@/lib/services/integrations/guard";

/**
 * TAUTAN PORTAL KARYAWAN untuk SATU orang, dicari lewat pemetaan akun PosPro
 * (`Employee.posproUserId`).
 *
 * Dipakai kartu kecil di dashboard PosPro: "Absensi saya → buka portal".
 * Sengaja hanya mengembalikan tautan + nama; seluruh datanya tetap dibaca di
 * portal `/me/[token]` yang sudah terkunci PIN.
 *
 * Keamanan: `posproUserId` datang dari JWT pemakai di sisi PosPro (bukan input
 * pengguna), dan endpoint ini tetap dijaga kunci + hanya pemanggil loopback —
 * sama seperti /api/integrations/hr-summary.
 */
export const GET = route(async (req: Request) => {
  requireIntegrationKey(req);

  const id = Number(new URL(req.url).searchParams.get("posproUserId"));
  if (!Number.isInteger(id) || id <= 0) {
    return json({ found: false, reason: "posproUserId tidak valid" }, { status: 400 });
  }

  const emp = await prisma.employee.findFirst({
    where: { posproUserId: id, deletedAt: null, isActive: true },
    select: { fullName: true, nickname: true, publicToken: true, portalPin: true },
  });

  if (!emp?.publicToken) {
    // Belum dipetakan ke akun PosPro, atau belum punya token portal.
    return json({ found: false });
  }

  const base = (process.env.APP_URL || "https://absensi.volikoprint.com").replace(/\/+$/, "");
  return json({
    found: true,
    name: emp.nickname || emp.fullName,
    portalUrl: `${base}/me/${emp.publicToken}`,
    /** Supaya PosPro bisa memberi petunjuk "buat PIN dulu" pada kunjungan pertama. */
    hasPin: !!emp.portalPin,
  });
});
