import { prisma } from "@/lib/prisma";
import { requireManager, json, route } from "@/lib/http";
import { getSetting } from "@/lib/settings";
import { mapScanlogs } from "@/lib/services/fingerspot/mapper";
import { pullDeviceLogs, toRawScans } from "@/lib/services/fingerspot/device";

/**
 * Tarik scanlog LANGSUNG dari mesin Fingerspot via IP (tanpa aplikasi bawaan).
 * POST body: { test?: boolean }
 *   test=true  → hanya uji koneksi + hitung jumlah record di mesin (tak menyimpan).
 *   selain itu → tarik semua log, petakan PIN→karyawan, simpan yang baru (dedup).
 */
export const POST = route(async (req: Request) => {
  await requireManager();

  const ip = (await getSetting("fp_device_ip"))?.trim();
  const port = Number(await getSetting("fp_device_port")) || 5005;
  if (!ip) {
    return json({ message: "IP mesin belum diatur di Pengaturan." }, { status: 422 });
  }

  const body = (await req.json().catch(() => ({}))) as { test?: boolean };

  try {
    if (body.test) {
      const { count } = await pullDeviceLogs({ ip, port, countOnly: true });
      return json({ ok: true, count, message: `Terhubung ke ${ip}:${port}. ${count} record di mesin.` });
    }

    const { count, records } = await pullDeviceLogs({ ip, port });

    const employees = await prisma.employee.findMany({
      where: { deletedAt: null, machinePin: { not: null } },
      select: { id: true, machinePin: true },
    });
    const codeToId = Object.fromEntries(employees.map((e) => [e.machinePin as string, e.id]));

    const { mapped, unmatched } = mapScanlogs(toRawScans(records), { codeToId });

    let synced = 0;
    for (const m of mapped) {
      const exists = await prisma.attendance.findFirst({
        where: { employeeId: m.employeeId, scanDate: m.scanDate },
        select: { id: true },
      });
      if (exists) continue;
      await prisma.attendance.create({
        data: {
          employeeId: m.employeeId,
          scanDate: m.scanDate,
          scanType: m.scanType,
          status: "on_time",
          machineName: "fingerspot-ip",
          snMachine: (await getSetting("fingerspot_sn")) || null,
        },
      });
      synced++;
    }

    const unmatchedPins = Array.from(new Set(unmatched));
    return json({
      ok: true,
      total: count,
      mapped: mapped.length,
      synced,
      unmatchedCount: unmatchedPins.length,
      unmatchedPins: unmatchedPins.slice(0, 50),
    });
  } catch (e) {
    return json({ message: (e as Error).message }, { status: 502 });
  }
});
