import { prisma } from "@/lib/prisma";
import { parseAttlog, handshakeResponse } from "@/lib/services/fingerspot/adms";
import { mapScanlogs } from "@/lib/services/fingerspot/mapper";

const textPlain = { "Content-Type": "text/plain" };

// GET /iclock/cdata?SN=xxx&options=all -> handshake mesin
export async function GET(req: Request) {
  const sn = new URL(req.url).searchParams.get("SN") ?? "unknown";
  // Catat handshake supaya kita tahu mesin sudah terkoneksi.
  await prisma.fingerspotRawLog.create({
    data: { snMachine: sn, pin: null, scanAt: null, rawBody: { event: "handshake", sn }, processed: true },
  });
  return new Response(handshakeResponse(sn), { headers: textPlain });
}

// POST /iclock/cdata?SN=xxx&table=ATTLOG -> data absensi (body tab-separated)
export async function POST(req: Request) {
  const url = new URL(req.url);
  const sn = url.searchParams.get("SN") ?? "unknown";
  const table = url.searchParams.get("table") ?? "";
  const body = await req.text();

  // Simpan mentah SELALU (audit + debug protokol).
  await prisma.fingerspotRawLog.create({
    data: {
      snMachine: sn,
      pin: null,
      scanAt: null,
      rawBody: { table, sn, body },
      processed: table.toUpperCase() !== "ATTLOG", // non-ATTLOG dianggap sudah beres
    },
  });

  // Hanya ATTLOG yang berisi scan absensi.
  if (table.toUpperCase() === "ATTLOG") {
    const records = parseAttlog(body);
    if (records.length > 0) {
      const employees = await prisma.employee.findMany({
        where: { deletedAt: null },
        select: { id: true, employeeCode: true },
      });
      const codeToId = Object.fromEntries(employees.map((e) => [e.employeeCode, e.id]));
      const { mapped } = mapScanlogs(
        records.map((r) => ({ pin: r.pin, scanAt: r.time.replace(" ", "T") })),
        { codeToId }
      );
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
            machineName: "fingerspot",
            snMachine: sn,
          },
        });
      }
    }
  }

  // Firmware ZK mengharapkan "OK".
  return new Response("OK", { headers: textPlain });
}
