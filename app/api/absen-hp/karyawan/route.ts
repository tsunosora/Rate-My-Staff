import { prisma } from "@/lib/prisma";
import { requireManager, json, route } from "@/lib/http";

/** Karyawan aktif + keadaan absen HP-nya. Sidik HP tidak dikirim — cukup "terkunci" atau tidak. */
export const GET = route(async () => {
  await requireManager();
  const daftar = await prisma.employee.findMany({
    where: { deletedAt: null, isActive: true },
    orderBy: { fullName: "asc" },
    select: {
      id: true, fullName: true, publicToken: true, absenHp: true, absenHpPerangkatAt: true,
      portalPin: true, position: { select: { name: true } },
    },
  });
  return json(
    daftar.map((e) => ({
      id: e.id,
      nama: e.fullName,
      jabatan: e.position?.name ?? null,
      aktif: e.absenHp,
      hpTerkunciSejak: e.absenHpPerangkatAt,
      punyaPin: e.portalPin !== null,
      token: e.absenHp ? e.publicToken : null,
    })),
  );
});
