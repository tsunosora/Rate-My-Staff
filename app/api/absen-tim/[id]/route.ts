import { prisma } from "@/lib/prisma";
import { requireManager, json, notFound, route } from "@/lib/http";
import { hitungStatus, jarakMeter } from "@/lib/services/absen-tim/aturan";

type Ctx = { params: Promise<{ id: string }> };

/** Satu sesi absen tim + barisnya (foto, jam, jarak dari titik sesi, label freelance baru). */
export const GET = route<Ctx>(async (_req, ctx) => {
  await requireManager();
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return notFound("Sesi tidak ditemukan.");

  const s = await prisma.sesiAbsenTim.findUnique({
    where: { id },
    select: {
      id: true, namaTempat: true, mulaiAt: true, lat: true, lng: true, akurasiM: true,
      pic: { select: { id: true, fullName: true } },
      baris: {
        orderBy: [{ employeeId: "asc" }, { waktu: "asc" }],
        select: {
          id: true, jenis: true, waktu: true, lat: true, lng: true, akurasiM: true, status: true,
          catatanKeputusan: true, decidedAt: true, attendanceId: true,
          decidedBy: { select: { name: true } },
          employee: {
            select: {
              id: true, fullName: true, employeeCode: true, jenis: true, perluDiperiksa: true, phone: true,
              didaftarkanOleh: { select: { fullName: true } },
            },
          },
        },
      },
    },
  });
  if (!s) return notFound("Sesi tidak ditemukan.");

  return json({
    id: s.id,
    namaTempat: s.namaTempat,
    mulaiAt: s.mulaiAt,
    lat: s.lat,
    lng: s.lng,
    akurasiM: s.akurasiM,
    pic: s.pic.fullName,
    jumlah: hitungStatus(s.baris),
    baris: s.baris.map((b) => ({
      id: b.id,
      jenis: b.jenis,
      waktu: b.waktu,
      lat: b.lat,
      lng: b.lng,
      akurasiM: b.akurasiM,
      jarakM: Math.round(jarakMeter(b.lat, b.lng, s.lat, s.lng)),
      status: b.status,
      catatan: b.catatanKeputusan,
      diputusPada: b.decidedAt,
      diputusOleh: b.decidedBy?.name ?? null,
      tercatat: b.attendanceId !== null,
      foto: `/api/absen-tim/foto/${b.id}`,
      karyawanId: b.employee.id,
      nama: b.employee.fullName,
      kode: b.employee.employeeCode,
      freelance: b.employee.jenis === "freelance",
      freelanceBaru: b.employee.jenis === "freelance" && b.employee.perluDiperiksa,
      didaftarkanOleh: b.employee.didaftarkanOleh?.fullName ?? null,
    })),
  });
});
