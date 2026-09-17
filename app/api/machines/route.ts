import { prisma } from "@/lib/prisma";
import { requireSession, json, route } from "@/lib/http";

/** Daftar mesin absensi (per cabang) + jumlah karyawan terdaftar. */
export const GET = route(async () => {
  await requireSession();
  const machines = await prisma.machine.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { enrollments: true, attendances: true } } },
  });
  return json(
    machines.map((m) => ({
      id: m.id,
      sn: m.sn,
      name: m.name,
      lastSeenAt: m.lastSeenAt,
      employees: m._count.enrollments,
      attendances: m._count.attendances,
    }))
  );
});
