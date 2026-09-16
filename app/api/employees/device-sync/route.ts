import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireManager, json, route } from "@/lib/http";
import { getSetting } from "@/lib/settings";
import { nextEmployeeCode } from "@/lib/services/employee-code";
import { pullDeviceUsers } from "@/lib/services/fingerspot/device";

/**
 * Sinkron karyawan dari daftar user MESIN (via IP): ambil PIN + NAMA dari mesin,
 * buat karyawan baru dengan nama sesuai mesin. PIN yang sudah terpasang di
 * karyawan mana pun (machinePin) dilewati (nama tak ditimpa).
 */
export const POST = route(async () => {
  await requireManager();

  const ip = (await getSetting("fp_device_ip"))?.trim();
  const port = Number(await getSetting("fp_device_port")) || 5005;
  if (!ip) return json({ message: "IP mesin belum diatur di Pengaturan." }, { status: 422 });

  try {
    const { users } = await pullDeviceUsers({ ip, port });

    const existing = await prisma.employee.findMany({
      where: { machinePin: { in: users.map((u) => u.pin) } },
      select: { id: true, machinePin: true, fullName: true },
    });
    const byPin = new Map(existing.map((e) => [e.machinePin, e]));

    let created = 0;
    let renamed = 0;
    for (const u of users) {
      const realName = u.name?.trim();
      const placeholder = `Karyawan ${u.pin}`;
      const emp = byPin.get(u.pin);
      if (emp) {
        // Perbarui nama HANYA bila masih placeholder & mesin punya nama asli
        // (nama yang sudah diedit manual tidak ditimpa).
        if (realName && emp.fullName === placeholder) {
          await prisma.employee.update({ where: { id: emp.id }, data: { fullName: realName } });
          renamed++;
        }
        continue;
      }
      const fullName = realName || placeholder;
      const code = await nextEmployeeCode(prisma, fullName);
      await prisma.employee.create({
        data: { employeeCode: code, machinePin: u.pin, publicToken: randomUUID(), fullName },
      });
      created++;
    }

    return json({
      ok: true,
      total: users.length,
      created,
      renamed,
      existing: users.length - created,
    });
  } catch (e) {
    return json({ message: (e as Error).message }, { status: 502 });
  }
});
