import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, route } from "@/lib/http";
import { upsertEnrollment } from "@/lib/services/fingerspot/sync";
import { recomputeStoredStatus } from "@/lib/services/attendance/recompute";
import { ingestScansForMachine, relabelDeviceScans } from "@/lib/services/fingerspot/sync";
import { parseIoTime } from "@/lib/services/fingerspot/realtime";

const schema = z.object({
  machineId: z.number().int().positive(),
  pin: z.string().trim().min(1).max(50),
  nama: z.string().trim().min(2, "Nama minimal 2 huruf").max(150),
});

/**
 * POST — buat karyawan untuk PIN yang sudah scan di mesin tapi belum punya data (mis. data
 * pendaftaran dari mesin pernah gagal terkirim). Scan PIN itu yang sudah tersimpan di log mentah
 * ikut dimasukkan ke absensi, supaya kehadirannya tidak hilang.
 */
export const POST = route(async (req) => {
  await requireManager();
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const { machineId, pin, nama } = parsed.data;

  const mesin = await prisma.machine.findUnique({ where: { id: machineId } });
  if (!mesin) return json({ message: "Mesin tidak ditemukan." }, { status: 404 });

  const hasil = await upsertEnrollment(machineId, pin, nama);
  if (hasil === "skipped") {
    const ada = await prisma.machineEnrollment.findUnique({ where: { machineId_pin: { machineId, pin } } });
    if (!ada) {
      return json(
        { message: "Batas jumlah karyawan di langganan sudah penuh. Nonaktifkan karyawan yang sudah keluar atau naikkan paket." },
        { status: 403 },
      );
    }
  }

  // Masukkan scan lama PIN ini yang belum terpetakan (tersimpan di log mentah). Penerima realtime
  // menyimpan scanAt KOSONG — jam scannya ada di rawBody.data.io_time.
  const log = await prisma.fingerspotRawLog.findMany({
    where: { snMachine: mesin.sn, pin },
    select: { scanAt: true, rawBody: true },
  });
  const scans = log
    .map((l) => {
      const body = l.rawBody as { request_code?: string; data?: { io_time?: unknown } } | null;
      if (body?.request_code && body.request_code !== "realtime_glog") return null;
      const at = l.scanAt ?? parseIoTime(body?.data?.io_time);
      return at ? { pin, scanAt: at } : null;
    })
    .filter((x): x is { pin: string; scanAt: Date } => x !== null);
  const { synced } = await ingestScansForMachine(machineId, mesin.sn, scans);
  if (synced > 0) {
    await relabelDeviceScans();
    const emp = await prisma.machineEnrollment.findUnique({ where: { machineId_pin: { machineId, pin } } });
    if (emp) await recomputeStoredStatus(prisma, { employeeIds: [emp.employeeId] });
  }
  return json({ ok: true, hasil, scanDimasukkan: synced });
});
