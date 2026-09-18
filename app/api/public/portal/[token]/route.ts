import { cookies } from "next/headers";
import { json, route } from "@/lib/http";
import { requireEmployeeByToken, portalSecret } from "@/lib/services/portal/auth";
import { PORTAL_COOKIE, verifyPortalToken } from "@/lib/services/portal/session";

type Ctx = { params: Promise<{ token: string }> };

/**
 * PUBLIK — keadaan halaman portal: identitas ringkas karyawan, apakah PIN sudah dibuat,
 * dan apakah pengunjung sudah melewati layar PIN. Data sensitif TIDAK ada di sini.
 */
export const GET = route<Ctx>(async (_req, ctx) => {
  const { token } = await ctx.params;
  const employee = await requireEmployeeByToken(token);

  const store = await cookies();
  const session = verifyPortalToken(store.get(PORTAL_COOKIE)?.value, token, portalSecret());

  return json({
    employee: {
      fullName: employee.fullName,
      nickname: employee.nickname,
      position: employee.position?.name ?? null,
      department: employee.department?.name ?? null,
      photoPath: employee.photoPath,
    },
    pinSet: employee.portalPin !== null,
    authenticated: session?.employeeId === employee.id,
  });
});
