import { prisma } from "@/lib/prisma";
import { json, route } from "@/lib/http";
import { wajibPic } from "@/lib/services/absen-tim/pic";

type Ctx = { params: Promise<{ token: string }> };

/**
 * PUBLIK (sesi PIN PIC) — cari karyawan aktif untuk diabsen. Cuma nama, jabatan, dan label
 * freelance: PIC tidak perlu (dan tidak boleh) melihat data karyawan lain lebih dari itu.
 * Minimal 2 huruf, maksimal 20 hasil — bukan jalan untuk mengunduh seluruh daftar karyawan.
 */
export const GET = route<Ctx>(async (req, ctx) => {
  const { token } = await ctx.params;
  const pic = await wajibPic(token, req);
  const q = (new URL(req.url).searchParams.get("q") ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
  if (q.length < 2) return json({ items: [] });

  const daftar = await prisma.employee.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      id: { not: pic.id },
      OR: [{ fullName: { contains: q } }, { nickname: { contains: q } }],
    },
    orderBy: { fullName: "asc" },
    take: 20,
    select: { id: true, fullName: true, jenis: true, perluDiperiksa: true, position: { select: { name: true } } },
  });
  return json({
    items: daftar.map((e) => ({
      id: e.id,
      nama: e.fullName,
      jabatan: e.position?.name ?? null,
      freelance: e.jenis === "freelance",
      freelanceBaru: e.jenis === "freelance" && e.perluDiperiksa,
    })),
  });
});
