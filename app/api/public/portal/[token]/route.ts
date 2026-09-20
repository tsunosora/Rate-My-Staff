import { cookies } from "next/headers";
import { json, route } from "@/lib/http";
import {
  requireEmployeeByToken,
  portalSecret,
  viewerIsManager,
  managerModeRequested,
} from "@/lib/services/portal/auth";
import { PORTAL_COOKIE, verifyPortalToken } from "@/lib/services/portal/session";
import { posproPinAvailable } from "@/lib/services/pospro/client";

type Ctx = { params: Promise<{ token: string }> };

/**
 * PUBLIK — keadaan halaman portal: identitas ringkas karyawan, apakah PIN sudah dibuat,
 * dan apakah pengunjung sudah melewati layar PIN. Data sensitif TIDAK ada di sini.
 */
export const GET = route<Ctx>(async (req, ctx) => {
  const { token } = await ctx.params;
  const employee = await requireEmployeeByToken(token);

  const store = await cookies();
  const session = verifyPortalToken(store.get(PORTAL_COOKIE)?.value, token, portalSecret());
  // PIN PosPro (PIN desainer/piket) boleh dipakai masuk, supaya karyawan tak perlu
  // mengingat dua PIN. false bila belum dipetakan / tak punya PIN / PosPro mati.
  const posproPin = await posproPinAvailable(employee.posproUserId);
  // Owner/HR/Admin boleh langsung melihat — TAPI harus meminta tegas lewat ?owner=1.
  // Tanpa penanda itu, tautan yang sama berperilaku sama persis bagi siapa pun,
  // sehingga owner bisa memeriksa apa yang benar-benar dilihat karyawannya.
  const asManager = managerModeRequested(req) && (await viewerIsManager());

  return json({
    employee: {
      fullName: employee.fullName,
      nickname: employee.nickname,
      position: employee.position?.name ?? null,
      department: employee.department?.name ?? null,
      photoPath: employee.photoPath,
    },
    pinSet: employee.portalPin !== null,
    posproPin,
    asManager,
    authenticated: session?.employeeId === employee.id || asManager,
  });
});
