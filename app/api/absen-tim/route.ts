import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireManager, json, route } from "@/lib/http";
import { hitungStatus } from "@/lib/services/absen-tim/aturan";

const STATUS = new Set(["menunggu", "diterima", "ditolak"]);

/** "2026-10-18" → Date tengah malam lokal; selain itu null. */
function tanggal(s: string | null): Date | null {
  const m = String(s ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Daftar sesi absen tim, terbaru dulu. `?status=menunggu|diterima|ditolak` = sesi yang punya
 * minimal satu baris berstatus itu; `?dari=&sampai=` (YYYY-MM-DD, inklusif). Tanpa tanggal =
 * semua (300 sesi terbaru). `menungguTotal` untuk lencana di tombol saring.
 */
export const GET = route(async (req) => {
  await requireManager();
  const p = new URL(req.url).searchParams;
  const s = p.get("status") ?? "";
  const dari = tanggal(p.get("dari"));
  const sampai = tanggal(p.get("sampai"));
  if (sampai) sampai.setDate(sampai.getDate() + 1);

  const where: Prisma.SesiAbsenTimWhereInput = {
    ...(STATUS.has(s) ? { baris: { some: { status: s } } } : {}),
    ...(dari || sampai ? { mulaiAt: { ...(dari ? { gte: dari } : {}), ...(sampai ? { lt: sampai } : {}) } } : {}),
  };

  const [daftar, menungguTotal, freelanceBaru] = await Promise.all([
    prisma.sesiAbsenTim.findMany({
      where,
      orderBy: { mulaiAt: "desc" },
      take: 300,
      select: {
        id: true, namaTempat: true, mulaiAt: true, lat: true, lng: true, akurasiM: true,
        pic: { select: { id: true, fullName: true } },
        baris: { select: { status: true, employeeId: true } },
      },
    }),
    prisma.absenTimBaris.count({ where: { status: "menunggu" } }),
    prisma.employee.count({ where: { deletedAt: null, isActive: true, perluDiperiksa: true } }),
  ]);

  return json({
    menungguTotal,
    freelanceBaru,
    items: daftar.map((d) => ({
      id: d.id,
      namaTempat: d.namaTempat,
      mulaiAt: d.mulaiAt,
      lat: d.lat,
      lng: d.lng,
      akurasiM: d.akurasiM,
      pic: d.pic.fullName,
      picId: d.pic.id,
      orang: new Set(d.baris.map((b) => b.employeeId)).size,
      jumlah: hitungStatus(d.baris),
    })),
  });
});
