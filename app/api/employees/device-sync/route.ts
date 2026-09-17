import { requireManager, json, route } from "@/lib/http";
import { getSetting } from "@/lib/settings";
import { pullDeviceUsers } from "@/lib/services/fingerspot/device";
import { resolveMachine, upsertEnrollment } from "@/lib/services/fingerspot/sync";

/**
 * Sinkron karyawan dari daftar user MESIN (via IP): ambil PIN + NAMA dari mesin,
 * daftarkan per-mesin (SN). PIN yang sudah terdaftar di mesin ini dilewati; nama
 * placeholder diperbarui ke nama asli.
 */
export const POST = route(async () => {
  await requireManager();

  const ip = (await getSetting("fp_device_ip"))?.trim();
  const port = Number(await getSetting("fp_device_port")) || 5005;
  if (!ip) return json({ message: "IP mesin belum diatur di Pengaturan." }, { status: 422 });

  const sn = (await getSetting("fingerspot_sn"))?.trim() || `direct-ip:${ip}`;

  try {
    const { users } = await pullDeviceUsers({ ip, port });
    const machine = await resolveMachine(sn);

    let created = 0;
    let renamed = 0;
    for (const u of users) {
      const res = await upsertEnrollment(machine.id, u.pin, u.name);
      if (res === "created") created++;
      else if (res === "renamed") renamed++;
    }

    return json({
      ok: true,
      machineName: machine.name,
      total: users.length,
      created,
      renamed,
      existing: users.length - created,
    });
  } catch (e) {
    return json({ message: (e as Error).message }, { status: 502 });
  }
});
