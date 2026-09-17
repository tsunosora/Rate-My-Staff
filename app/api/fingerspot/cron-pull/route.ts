import { prisma } from "@/lib/prisma";
import { syncMachinePull } from "@/lib/services/fingerspot/sync";

/**
 * PUBLIK (di-whitelist proxy) — pemicu tarik OTOMATIS untuk mesin mode LAN yang
 * mengaktifkan autoPull. Dipanggil scheduler (scripts/poll-attendance.mjs).
 * Dilindungi secret: header `x-cron-secret` == env CRON_SECRET.
 * Tiap mesin ditarik hanya bila sudah lewat pullIntervalMinutes sejak terakhir.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ ok: false, message: "CRON_SECRET belum diset." }, { status: 503 });
  const provided = req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret");
  if (provided !== secret) return Response.json({ ok: false, message: "unauthorized" }, { status: 401 });

  const machines = await prisma.machine.findMany({ where: { mode: "lan", autoPull: true } });
  const now = Date.now();
  const due = machines.filter(
    (m) => !m.lastSeenAt || now - m.lastSeenAt.getTime() >= m.pullIntervalMinutes * 60 * 1000
  );

  if (due.length === 0) {
    return Response.json({ ok: true, skipped: true, message: `Tak ada mesin LAN yang jatuh tempo (${machines.length} auto-pull aktif).` });
  }

  const results: { machine: string; synced?: number; error?: string }[] = [];
  for (const m of due) {
    try {
      const r = await syncMachinePull(m.id);
      results.push({ machine: r.machineName, synced: r.synced });
      console.log(`[cron-pull] ${r.machineName}: ${r.synced} scan baru.`);
    } catch (e) {
      results.push({ machine: m.name, error: (e as Error).message });
      console.error(`[cron-pull] ${m.name} gagal:`, (e as Error).message);
    }
  }
  return Response.json({ ok: true, pulled: results.length, results });
}
