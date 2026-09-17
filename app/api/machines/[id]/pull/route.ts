import { prisma } from "@/lib/prisma";
import { requireManager, json, route } from "@/lib/http";
import { pullDeviceLogs } from "@/lib/services/fingerspot/device";
import { syncMachinePull, syncMachineUsers } from "@/lib/services/fingerspot/sync";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Aksi mesin mode LAN.
 * body { test: true }  → uji koneksi live (probe IP:port) + hitung record.
 * body { users: true } → sinkron karyawan (PIN+nama).
 * selain itu           → tarik absensi.
 */
export const POST = route<Ctx>(async (req, ctx) => {
  await requireManager();
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { test?: boolean; users?: boolean };
  try {
    if (body.test) {
      const m = await prisma.machine.findUnique({ where: { id: Number(id) } });
      if (!m || m.mode !== "lan" || !m.ip) return json({ ok: false, message: "Mesin bukan LAN / IP belum diatur." }, { status: 422 });
      const { count } = await pullDeviceLogs({ ip: m.ip, port: m.port || 5005, countOnly: true, timeoutMs: 8000 });
      await prisma.machine.update({ where: { id: m.id }, data: { lastSeenAt: new Date() } });
      return json({ ok: true, online: true, count, message: `Terhubung ke ${m.ip}:${m.port || 5005} · ${count} record.` });
    }
    if (body.users) return json({ ok: true, ...(await syncMachineUsers(Number(id))) });
    return json({ ok: true, ...(await syncMachinePull(Number(id))) });
  } catch (e) {
    return json({ ok: false, message: (e as Error).message }, { status: 502 });
  }
});
