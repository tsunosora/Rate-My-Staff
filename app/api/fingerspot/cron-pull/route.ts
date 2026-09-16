import { getSetting } from "@/lib/settings";
import { syncDeviceAttendance } from "@/lib/services/fingerspot/sync";

/**
 * PUBLIK (di-whitelist proxy) — pemicu tarik absensi otomatis (dipanggil scheduler).
 * Dilindungi secret: header `x-cron-secret` harus sama dengan env CRON_SECRET.
 * Hanya jalan bila setting `fp_device_auto` = "true".
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ ok: false, message: "CRON_SECRET belum diset di server." }, { status: 503 });
  }
  const provided = req.headers.get("x-cron-secret") ?? new URL(req.url).searchParams.get("secret");
  if (provided !== secret) {
    return Response.json({ ok: false, message: "unauthorized" }, { status: 401 });
  }

  const auto = (await getSetting("fp_device_auto")) === "true";
  if (!auto) {
    return Response.json({ ok: true, skipped: true, message: "Tarik otomatis dimatikan (fp_device_auto)." });
  }

  try {
    const result = await syncDeviceAttendance();
    console.log(`[cron-pull] ${result.synced} scan baru dari ${result.total} record mesin.`);
    return Response.json({ ok: true, ...result });
  } catch (e) {
    console.error("[cron-pull] gagal:", (e as Error).message);
    return Response.json({ ok: false, message: (e as Error).message }, { status: 502 });
  }
}
