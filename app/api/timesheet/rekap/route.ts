import { prisma } from "@/lib/prisma";
import { requireManager, json, route } from "@/lib/http";
import { bangunRekap, filterAdminDari } from "@/lib/services/timesheet/service";

/** Rekap timesheet: per karyawan (tercatat vs hadir, per hari & minggu) dan per proyek. */
export const GET = route(async (req: Request) => {
  await requireManager();
  return json(await bangunRekap(prisma, filterAdminDari(new URL(req.url).searchParams)));
});
