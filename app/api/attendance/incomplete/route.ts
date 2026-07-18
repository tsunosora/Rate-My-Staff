import { prisma } from "@/lib/prisma";
import { requireSession, json, route } from "@/lib/http";
import { computeShift, suggestMissingTime, loadShiftConfig } from "@/lib/services/attendance/shift";

function fmt(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function minOfDay(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Absensi TIDAK KOMPLIT pada satu tanggal: karyawan yang hanya punya scan masuk (tanpa pulang)
 * atau hanya scan pulang (tanpa masuk). Dipakai halaman Absensi untuk dilengkapi manual.
 */
export const GET = route(async (req: Request) => {
  await requireSession();
  const sp = new URL(req.url).searchParams;
  const dateStr = sp.get("date") ?? new Date().toISOString().slice(0, 10);
  const start = new Date(`${dateStr}T00:00:00`);
  const end = new Date(start.getTime() + 86400000);

  const scans = await prisma.attendance.findMany({
    where: { scanDate: { gte: start, lt: end } },
    include: { employee: { select: { fullName: true, employeeCode: true } } },
    orderBy: { scanDate: "asc" },
  });

  const byEmp = new Map<number, typeof scans>();
  for (const s of scans) {
    if (s.scanType === "absence") continue;
    const arr = byEmp.get(s.employeeId) ?? [];
    arr.push(s);
    byEmp.set(s.employeeId, arr);
  }

  const cfg = await loadShiftConfig();
  const result = [];
  for (const [employeeId, list] of byEmp) {
    const ins = list.filter((s) => s.scanType === "in");
    const outs = list.filter((s) => s.scanType === "out");
    const hasIn = ins.length > 0;
    const hasOut = outs.length > 0;
    if (hasIn && hasOut) continue; // komplit
    if (!hasIn && !hasOut) continue; // tak ada scan berwaktu

    const missing: "in" | "out" = hasIn ? "out" : "in";
    const inMin = hasIn ? minOfDay(ins[0].scanDate) : null;
    const outMin = hasOut ? minOfDay(outs[outs.length - 1].scanDate) : null;
    const shift = computeShift(inMin, outMin, cfg).shift;

    result.push({
      employeeId,
      fullName: list[0].employee.fullName,
      employeeCode: list[0].employee.employeeCode,
      date: dateStr,
      clockIn: hasIn ? fmt(ins[0].scanDate) : null,
      clockOut: hasOut ? fmt(outs[outs.length - 1].scanDate) : null,
      missing,
      suggested: suggestMissingTime(shift, missing, cfg),
    });
  }

  return json(result);
});
