import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { badRequest, json, route } from "@/lib/http";
import { wajibPic } from "@/lib/services/absen-tim/pic";
import { anggotaTim, keluarkanAnggota, tambahAnggota, timUntukPic } from "@/lib/services/tim-kerja/service";

type Ctx = { params: Promise<{ token: string }> };

/**
 * PUBLIK (sesi PIN PIC) — "Kelola tim" di HP PIC.
 * GET  → anggota tim; dengan `?q=` (≥ 2 huruf) juga karyawan aktif yang BELUM punya tim (maks 20,
 *        cuma nama + jabatan — PIC tidak perlu melihat data karyawan lain lebih dari itu).
 * POST `{ employeeId }` → masukkan ke tim. Orang yang sudah di tim lain ditolak: memindahkan
 *        anggota antar tim wewenang admin, bukan PIC.
 * DELETE `?employeeId=` → keluarkan dari tim (timId kosong). Kepala tim tidak bisa dikeluarkan.
 * Daftarkan freelance baru: POST …/tim/freelance (langsung masuk tim ini).
 */
export const GET = route<Ctx>(async (req, ctx) => {
  const { token } = await ctx.params;
  const pic = await wajibPic(token, req);
  const tim = await timUntukPic(prisma, pic.id);
  const q = (new URL(req.url).searchParams.get("q") ?? "").replace(/\s+/g, " ").trim().slice(0, 60);

  const [anggota, tersedia] = await Promise.all([
    anggotaTim(prisma, tim),
    q.length < 2
      ? Promise.resolve([])
      : prisma.employee.findMany({
          where: { deletedAt: null, isActive: true, timId: null, OR: [{ fullName: { contains: q } }, { nickname: { contains: q } }] },
          orderBy: { fullName: "asc" },
          take: 20,
          select: { id: true, fullName: true, jenis: true, perluDiperiksa: true, position: { select: { name: true } } },
        }),
  ]);
  const ringkas = (e: { id: number; fullName: string; jenis: string; perluDiperiksa: boolean; position: { name: string } | null }) => ({
    id: e.id,
    nama: e.fullName,
    jabatan: e.position?.name ?? null,
    freelance: e.jenis === "freelance",
    freelanceBaru: e.jenis === "freelance" && e.perluDiperiksa,
  });
  return json({
    tim: { id: tim.id, nama: tim.nama, kepala: tim.picNama, picId: tim.picId },
    anggota: anggota.map((a) => ({ ...ringkas(a), kepala: a.id === tim.picId })),
    tersedia: tersedia.map(ringkas),
  });
});

const tambahSchema = z.object({ employeeId: z.coerce.number().int().positive() });

export const POST = route<Ctx>(async (req, ctx) => {
  const { token } = await ctx.params;
  const pic = await wajibPic(token, req, true);
  const parsed = tambahSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const tim = await timUntukPic(prisma, pic.id);
  const k = await tambahAnggota(prisma, tim.id, parsed.data.employeeId);
  if (!k.ok) return json(k, { status: 422 });
  return json({ ok: true, sudahAnggota: k.sudahAnggota });
});

export const DELETE = route<Ctx>(async (req, ctx) => {
  const { token } = await ctx.params;
  const pic = await wajibPic(token, req, true);
  const id = Number(new URL(req.url).searchParams.get("employeeId"));
  if (!Number.isInteger(id) || id <= 0) return json({ ok: false, kode: "kiriman", alasan: "Pilih orangnya dulu." }, { status: 400 });
  const tim = await timUntukPic(prisma, pic.id);
  const k = await keluarkanAnggota(prisma, tim.id, id);
  if (!k.ok) return json(k, { status: 422 });
  return json({ ok: true });
});
