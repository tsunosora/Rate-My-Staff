import { prisma } from "@/lib/prisma";
import { getSetting } from "@/lib/settings";
import { mapScanlogs } from "./mapper";
import { pullDeviceLogs, toRawScans } from "./device";

export type DeviceSyncResult = {
  total: number;
  mapped: number;
  synced: number;
  unmatchedCount: number;
  unmatchedPins: string[];
};

/**
 * Tarik scanlog dari mesin (IP di setting) → petakan PIN→karyawan → simpan yang baru.
 * Dipakai oleh route manual (/api/attendance/device) & cron (/api/fingerspot/cron-pull).
 * Melempar Error bila IP belum diatur atau mesin tak terjangkau.
 */
export async function syncDeviceAttendance(): Promise<DeviceSyncResult> {
  const ip = (await getSetting("fp_device_ip"))?.trim();
  const port = Number(await getSetting("fp_device_port")) || 5005;
  if (!ip) throw new Error("IP mesin belum diatur di Pengaturan.");

  const { count, records } = await pullDeviceLogs({ ip, port });

  const employees = await prisma.employee.findMany({
    where: { deletedAt: null, machinePin: { not: null } },
    select: { id: true, machinePin: true },
  });
  const codeToId = Object.fromEntries(employees.map((e) => [e.machinePin as string, e.id]));

  const { mapped, unmatched } = mapScanlogs(toRawScans(records), { codeToId });
  const sn = (await getSetting("fingerspot_sn")) || null;

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
        snMachine: sn,
      },
    });
    synced++;
  }

  const unmatchedPins = Array.from(new Set(unmatched));
  return {
    total: count,
    mapped: mapped.length,
    synced,
    unmatchedCount: unmatchedPins.length,
    unmatchedPins: unmatchedPins.slice(0, 50),
  };
}
