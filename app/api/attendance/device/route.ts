import { requireManager, json, route } from "@/lib/http";
import { getSetting } from "@/lib/settings";
import { pullDeviceLogs } from "@/lib/services/fingerspot/device";
import { syncDeviceAttendance } from "@/lib/services/fingerspot/sync";

/**
 * Tarik scanlog LANGSUNG dari mesin Fingerspot via IP (tanpa aplikasi bawaan).
 * POST body: { test?: boolean }
 *   test=true  → hanya uji koneksi + hitung jumlah record di mesin (tak menyimpan).
 *   selain itu → tarik semua log, petakan PIN→karyawan, simpan yang baru (dedup).
 */
export const POST = route(async (req: Request) => {
  await requireManager();

  const body = (await req.json().catch(() => ({}))) as { test?: boolean };

  try {
    if (body.test) {
      const ip = (await getSetting("fp_device_ip"))?.trim();
      const port = Number(await getSetting("fp_device_port")) || 5005;
      if (!ip) return json({ message: "IP mesin belum diatur di Pengaturan." }, { status: 422 });
      const { count } = await pullDeviceLogs({ ip, port, countOnly: true });
      return json({ ok: true, count, message: `Terhubung ke ${ip}:${port}. ${count} record di mesin.` });
    }

    const result = await syncDeviceAttendance();
    return json({ ok: true, ...result });
  } catch (e) {
    const msg = (e as Error).message;
    const status = msg.includes("belum diatur") ? 422 : 502;
    return json({ message: msg }, { status });
  }
});
