import { requireManager, json, route } from "@/lib/http";
import { getSetting } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import { pullDeviceUsers } from "@/lib/services/fingerspot/device";
import { resolveMachine, syncMachineUsers, upsertEnrollment } from "@/lib/services/fingerspot/sync";
import { keadaanPendaftaranMesin } from "@/lib/services/fingerspot/pendaftaran";

/**
 * GET — keadaan pendaftaran dari mesin untuk Direktori: cara sinkron (lan/cloud), pendaftaran
 * terakhir yang dikirim mesin cloud, dan PIN yang scan tapi belum punya karyawan.
 */
export const GET = route(async () => {
  await requireManager();
  const ipLama = await getSetting("fp_device_ip");
  return json(await keadaanPendaftaranMesin(prisma, ipLama));
});

/**
 * POST — tarik daftar user (PIN + NAMA) dari mesin mode LAN dan daftarkan per mesin. PIN yang sudah
 * terdaftar dilewati; nama placeholder diperbarui ke nama asli.
 *
 * Mesin mode CLOUD tidak ditarik: ia mengirim sendiri data pendaftaran ke server, dan server tidak
 * bisa menjangkau IP mesin di jaringan toko.
 */
export const POST = route(async () => {
  await requireManager();

  const lan = await prisma.machine.findMany({ where: { mode: "lan", ip: { not: null } }, select: { id: true } });
  try {
    if (lan.length > 0) {
      let total = 0, created = 0, renamed = 0;
      for (const m of lan) {
        const r = await syncMachineUsers(m.id);
        total += r.total; created += r.created; renamed += r.renamed;
      }
      return json({ ok: true, total, created, renamed, existing: total - created });
    }

    // Setelan lama (sebelum ada daftar mesin): satu IP global di Pengaturan.
    const ip = (await getSetting("fp_device_ip"))?.trim();
    if (!ip) {
      return json(
        {
          message:
            "Mesin absensi di sini memakai mode cloud: karyawan yang didaftarkan di mesin masuk ke Direktori dengan sendirinya, tidak perlu ditarik.",
        },
        { status: 422 },
      );
    }
    const port = Number(await getSetting("fp_device_port")) || 5005;
    const sn = (await getSetting("fingerspot_sn"))?.trim() || `direct-ip:${ip}`;
    const { users } = await pullDeviceUsers({ ip, port });
    const machine = await resolveMachine(sn);

    let created = 0;
    let renamed = 0;
    for (const u of users) {
      const res = await upsertEnrollment(machine.id, u.pin, u.name);
      if (res === "created") created++;
      else if (res === "renamed") renamed++;
    }
    return json({ ok: true, total: users.length, created, renamed, existing: users.length - created });
  } catch (e) {
    return json({ message: (e as Error).message }, { status: 502 });
  }
});
