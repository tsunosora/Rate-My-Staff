import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireManager, json, route } from "@/lib/http";
import { getSetting } from "@/lib/settings";
import { nextEmployeeCode } from "@/lib/services/employee-code";
import { pullDeviceUsers } from "@/lib/services/fingerspot/device";

/**
 * Sinkron karyawan dari daftar user MESIN (via IP).
 * Mesin hanya menyimpan PIN (tanpa nama), jadi karyawan baru dibuat dengan
 * nama placeholder "Karyawan <PIN>" yang bisa diedit kemudian. PIN yang sudah
 * terpasang di karyawan mana pun (machinePin) dilewati.
 */
export const POST = route(async () => {
  await requireManager();

  const ip = (await getSetting("fp_device_ip"))?.trim();
  const port = Number(await getSetting("fp_device_port")) || 5005;
  if (!ip) return json({ message: "IP mesin belum diatur di Pengaturan." }, { status: 422 });

  try {
    const { pins } = await pullDeviceUsers({ ip, port });

    const existing = await prisma.employee.findMany({
      where: { machinePin: { in: pins } },
      select: { machinePin: true },
    });
    const known = new Set(existing.map((e) => e.machinePin));

    let created = 0;
    const createdPins: string[] = [];
    for (const pin of pins) {
      if (known.has(pin)) continue;
      const fullName = `Karyawan ${pin}`;
      const code = await nextEmployeeCode(prisma, fullName);
      await prisma.employee.create({
        data: {
          employeeCode: code,
          machinePin: pin,
          publicToken: randomUUID(),
          fullName,
        },
      });
      created++;
      createdPins.push(pin);
    }

    return json({
      ok: true,
      total: pins.length,
      created,
      existing: pins.length - created,
      createdPins,
      note: "Mesin hanya menyimpan PIN; nama diisi placeholder — silakan edit nama karyawan.",
    });
  } catch (e) {
    return json({ message: (e as Error).message }, { status: 502 });
  }
});
