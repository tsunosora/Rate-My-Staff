import { prisma } from "@/lib/prisma";
import { requireManager, json, route } from "@/lib/http";

/** Bukti absen HP pada satu tanggal (bawaan hari ini), terbaru dulu — termasuk pengajuan di luar lokasi. */
export const GET = route(async (req) => {
  await requireManager();
  const t = new URL(req.url).searchParams.get("tanggal");
  const awal = t && /^\d{4}-\d{2}-\d{2}$/.test(t) ? new Date(`${t}T00:00:00`) : new Date();
  awal.setHours(0, 0, 0, 0);
  const akhir = new Date(awal);
  akhir.setDate(akhir.getDate() + 1);

  const daftar = await prisma.absenHpBukti.findMany({
    where: { createdAt: { gte: awal, lt: akhir } },
    orderBy: { createdAt: "desc" },
    take: 300,
    select: {
      id: true, createdAt: true, jarakM: true, akurasiM: true, qr: true, attendanceId: true, status: true, alasan: true,
      employee: { select: { fullName: true } },
      lokasi: { select: { nama: true } },
    },
  });
  const jenis = await prisma.attendance.findMany({
    where: { id: { in: daftar.map((d) => d.attendanceId).filter((x): x is number => x !== null) } },
    select: { id: true, scanType: true },
  });
  const jenisDari = new Map(jenis.map((j) => [j.id, j.scanType]));
  return json(
    daftar.map((d) => ({
      id: d.id,
      waktu: d.createdAt,
      nama: d.employee.fullName,
      lokasi: d.lokasi?.nama ?? (d.jarakM < 0 ? "(belum ada lokasi)" : "(lokasi dihapus)"),
      jarakM: d.jarakM < 0 ? null : d.jarakM,
      akurasiM: d.akurasiM,
      qr: d.qr,
      // Pengajuan di luar lokasi: "menunggu"/"ditolak" BELUM/TIDAK tercatat di absensi.
      status: d.status,
      luar: d.alasan !== null,
      alasan: d.alasan,
      jenis: d.attendanceId ? jenisDari.get(d.attendanceId) ?? null : null,
      foto: `/api/absen-hp/foto/${d.id}`,
    })),
  );
});
