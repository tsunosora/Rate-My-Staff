import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireManager, json, route } from "@/lib/http";

const STATUS = new Set(["menunggu", "diterima", "ditolak"]);

/**
 * Pengajuan absen di luar lokasi (bukti ber-`alasan`), yang MENUNGGU dulu lalu terbaru.
 * `?status=menunggu|diterima|ditolak` menyaring; tanpa itu semuanya (300 terbaru).
 * Absen HP biasa (di dalam radius) tidak ada di sini — itu di Pengaturan → Absen lewat HP.
 */
export const GET = route(async (req) => {
  await requireManager();
  const s = new URL(req.url).searchParams.get("status") ?? "";
  const where: Prisma.AbsenHpBuktiWhereInput = { alasan: { not: null }, ...(STATUS.has(s) ? { status: s } : {}) };

  const [daftar, menunggu] = await Promise.all([
    prisma.absenHpBukti.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 300,
      select: {
        id: true, createdAt: true, lat: true, lng: true, akurasiM: true, jarakM: true, status: true,
        alasan: true, catatanKeputusan: true, decidedAt: true, attendanceId: true,
        employee: { select: { id: true, fullName: true, employeeCode: true } },
        lokasi: { select: { nama: true, radiusM: true } },
        decidedBy: { select: { name: true } },
      },
    }),
    prisma.absenHpBukti.count({ where: { alasan: { not: null }, status: "menunggu" } }),
  ]);

  // Menunggu di atas, sisanya terbaru dulu (findMany sudah terbaru dulu; sort stabil).
  const urut = [...daftar].sort((a, b) => Number(b.status === "menunggu") - Number(a.status === "menunggu"));
  return json({
    menunggu,
    items: urut.map((d) => ({
      id: d.id,
      waktu: d.createdAt,
      karyawanId: d.employee.id,
      nama: d.employee.fullName,
      kode: d.employee.employeeCode,
      lat: d.lat,
      lng: d.lng,
      akurasiM: d.akurasiM,
      jarakM: d.jarakM < 0 ? null : d.jarakM,
      lokasi: d.lokasi?.nama ?? null,
      radiusM: d.lokasi?.radiusM ?? null,
      status: d.status,
      alasan: d.alasan,
      catatan: d.catatanKeputusan,
      diputusPada: d.decidedAt,
      diputusOleh: d.decidedBy?.name ?? null,
      tercatat: d.attendanceId !== null,
      foto: `/api/absen-hp/foto/${d.id}`,
    })),
  });
});
