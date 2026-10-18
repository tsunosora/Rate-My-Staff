import { prisma } from "@/lib/prisma";
import { requireManager, json, route } from "@/lib/http";

/**
 * Freelance BARU yang didaftarkan PIC dan belum diperiksa owner/HR. Jumlah absennya ikut, supaya
 * owner bisa menilai: tukang yang tidak pernah diabsen lagi sesudah didaftarkan patut dicurigai.
 */
export const GET = route(async () => {
  await requireManager();
  const daftar = await prisma.employee.findMany({
    where: { deletedAt: null, isActive: true, perluDiperiksa: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, fullName: true, employeeCode: true, phone: true, createdAt: true,
      didaftarkanOleh: { select: { fullName: true } },
      _count: { select: { absenTimBaris: true } },
    },
  });
  return json(
    daftar.map((e) => ({
      id: e.id,
      nama: e.fullName,
      kode: e.employeeCode,
      hp: e.phone,
      didaftarkan: e.createdAt,
      oleh: e.didaftarkanOleh?.fullName ?? null,
      absen: e._count.absenTimBaris,
    })),
  );
});
