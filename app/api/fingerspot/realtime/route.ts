import { prisma } from "@/lib/prisma";
import { extractJson, parseIoTime } from "@/lib/services/fingerspot/realtime";
import { resolveMachine, ingestScansForMachine, relabelDeviceScans, upsertEnrollment } from "@/lib/services/fingerspot/sync";

/**
 * PENERIMA PROTOKOL REALTIME FINGERSPOT (mode Web mesin Revo).
 * Mesin POST ke "/" (proxy.ts me-rewrite ke sini bila ada header request_code).
 * WAJIB balas 200 + body kosong + header response_code:"OK" + trans_id, kalau tidak
 * mesin mengulang terus. Publik (di-whitelist proxy) — mesin tak bisa login.
 */
function ack(transId: string | null, responseCode = "OK") {
  const headers: Record<string, string> = {
    "Content-Type": "application/octet-stream",
    "response_code": responseCode,
  };
  if (transId) headers["trans_id"] = transId;
  return new Response(null, { status: 200, headers });
}

export async function POST(req: Request) {
  const requestCode = req.headers.get("request_code");
  const transId = req.headers.get("trans_id");
  const devId = req.headers.get("dev_id");

  const buf = Buffer.from(await req.arrayBuffer());
  const data = extractJson(buf) ?? {};

  try {
    // Audit: simpan mentah (tanpa blob biner besar — cukup JSON-nya).
    await prisma.fingerspotRawLog.create({
      data: {
        snMachine: devId,
        pin: (data.user_id as string | undefined) ?? null,
        scanAt: null,
        rawBody: { request_code: requestCode, trans_id: transId, data } as object,
        processed: requestCode !== "realtime_glog",
      },
    });

    // Sentuh lastSeenAt di SETIAP kontak (termasuk polling receive_cmd) + auto-daftar
    // mesin → status "terhubung" akurat.
    const machine = devId ? await resolveMachine(devId) : null;

    if (machine && requestCode === "realtime_glog") {
      const pin = String(data.user_id ?? "").trim();
      const scanAt = parseIoTime(data.io_time);
      if (pin && scanAt) {
        await ingestScansForMachine(machine.id, machine.sn, [{ pin, scanAt }]);
        await relabelDeviceScans();
      }
    } else if (machine && requestCode === "realtime_enroll_data") {
      const pin = String(data.user_id ?? "").trim();
      const name = (data.user_name as string | undefined) ?? null;
      if (pin) await upsertEnrollment(machine.id, pin, name);
    }
    // receive_cmd / send_cmd_result / lainnya: cukup di-ack (belum ada antrean perintah).
  } catch (e) {
    console.error("[realtime] gagal proses:", (e as Error).message);
    // Tetap balas OK agar mesin tak retry-storm; data mentah sudah tersimpan utk audit.
  }

  return ack(transId);
}
