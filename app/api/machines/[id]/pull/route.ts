import { requireManager, json, route } from "@/lib/http";
import { syncMachinePull, syncMachineUsers } from "@/lib/services/fingerspot/sync";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Aksi tarik untuk mesin mode LAN.
 * body { users: true } → sinkron karyawan (PIN+nama); selain itu → tarik absensi.
 */
export const POST = route<Ctx>(async (req, ctx) => {
  await requireManager();
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { users?: boolean };
  try {
    if (body.users) return json({ ok: true, ...(await syncMachineUsers(Number(id))) });
    return json({ ok: true, ...(await syncMachinePull(Number(id))) });
  } catch (e) {
    return json({ message: (e as Error).message }, { status: 502 });
  }
});
