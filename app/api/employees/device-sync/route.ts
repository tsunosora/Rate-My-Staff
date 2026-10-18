import { requireManager, json, route } from "@/lib/http";
import { getSetting } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import { pullDeviceUsers } from "@/lib/services/fingerspot/device";
import { resolveMachine, syncMachineUsers, upsertEnrollment } from "@/lib/services/fingerspot/sync";
import { keadaanPendaftaranMesin } from "@/lib/services/fingerspot/pendaftaran";
import { antreTarikPengguna, ringkasanTarikan } from "@/lib/services/fingerspot/perintah";
import { idPengguna } from "@/lib/services/absen-tim/simpan";

/**
 * GET — keadaan pendaftaran dari mesin untuk Direktori: cara sinkron (lan/cloud), pendaftaran
 * terakhir yang dikirim mesin cloud, dan PIN yang scan tapi belum punya karyawan.
 */
export const GET = route(async () => {
  await requireManager();
  const ipLama = await getSetting("fp_device_ip");
  const keadaan = await keadaanPendaftaranMesin(prisma, ipLama);
  return json({ ...keadaan, tarikan: await ringkasanTarikan(prisma) });
});

/**
 * POST — tarik daftar user (PIN + NAMA) dari mesin mode LAN dan daftarkan per mesin. PIN yang sudah
 * terdaftar dilewati; nama placeholder diperbarui ke nama asli.
 *
 * Mesin mode CLOUD tidak bisa dijangkau lewat IP. Untuknya perintah baca GET_USER_ID_LIST diantre
 * dan dikirim saat mesin mengecek perintah (~20 detik); karyawan yang belum ada dibuat begitu mesin
 * menjawab. Jawaban 202 — layar Direktori memantau kemajuannya lewat GET.
 */
export const POST = route(async () => {
  const session = await requireManager();

  const cloud = await prisma.machine.count({ where: { mode: "cloud" } });
  if (cloud > 0) {
    const r = await antreTarikPengguna(prisma, await idPengguna(session.user?.email));
    return json({ ok: true, cloud: true, ...r }, { status: 202 });
  }

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
    if (!ip) return json({ message: "Belum ada mesin absensi yang terdaftar." }, { status: 422 });
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
