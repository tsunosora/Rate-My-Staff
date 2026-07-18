import { prisma } from "@/lib/prisma";
import { requireSession, json, badRequest, route } from "@/lib/http";

function fmt(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Jam masuk & pulang seorang karyawan pada satu tanggal (untuk prefill Edit Absensi). */
export const GET = route(async (req: Request) => {
  await requireSession();
  const sp = new URL(req.url).searchParams;
  const dateStr = sp.get("date");
  const employeeId = Number(sp.get("employeeId"));
  if (!dateStr || !employeeId) return badRequest({ query: ["date & employeeId wajib"] });

  const start = new Date(`${dateStr}T00:00:00`);
  const end = new Date(start.getTime() + 86400000);
  const scans = await prisma.attendance.findMany({
    where: { employeeId, scanDate: { gte: start, lt: end } },
    orderBy: { scanDate: "asc" },
  });

  const ins = scans.filter((s) => s.scanType === "in");
  const outs = scans.filter((s) => s.scanType === "out");
  return json({
    clockIn: ins.length ? fmt(ins[0].scanDate) : null,
    clockOut: outs.length ? fmt(outs[outs.length - 1].scanDate) : null,
  });
});
