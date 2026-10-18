import { prisma } from "@/lib/prisma";
import { badRequest, json, route } from "@/lib/http";
import { wajibBolehMenambah } from "@/lib/lisensi/penjaga";
import { nextEmployeeCode } from "@/lib/services/employee-code";
import { putuskanFreelance } from "@/lib/services/absen-tim/aturan";
import { freelanceSchema } from "@/lib/services/absen-tim/skema";
import { wajibPic } from "@/lib/services/absen-tim/pic";
import { timUntukPic } from "@/lib/services/tim-kerja/service";

type Ctx = { params: Promise<{ token: string }> };

/**
 * PUBLIK (sesi PIN PIC) — daftarkan tukang freelance di tempat. Orangnya LANGSUNG MASUK tim PIC
 * (Kelola tim → Daftarkan freelance) dan langsung bisa direkap,
 * tapi berlabel "freelance baru — dari PIC <nama>" (perluDiperiksa) sampai owner/HR memeriksanya:
 * itu yang menahan tukang fiktif.
 *
 * DIHITUNG ke batas karyawan paket (limit.employees), sama dengan pembuatan karyawan manual —
 * kalau penuh, wajibBolehMenambah() menolak dengan pesan lisensi yang jelas. TIDAK bebas mode
 * hanya-baca: ini membuat data karyawan, bukan mencatat kehadiran.
 */
export const POST = route<Ctx>(async (req, ctx) => {
  const { token } = await ctx.params;
  const pic = await wajibPic(token, req, true);
  const parsed = freelanceSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const ada = await prisma.employee.findMany({
    where: { deletedAt: null, isActive: true, fullName: { contains: parsed.data.nama.trim().slice(0, 150) } },
    select: { fullName: true },
    take: 50,
  });
  const k = putuskanFreelance({ ...parsed.data, namaAda: ada.map((a) => a.fullName) });
  if (!k.ok) return json(k, { status: 422 });

  await wajibBolehMenambah("limit.employees");
  const tim = await timUntukPic(prisma, pic.id);
  const kode = await nextEmployeeCode(prisma, k.nama);
  const e = await prisma.employee.create({
    data: {
      employeeCode: kode,
      fullName: k.nama,
      phone: k.hp,
      jenis: "freelance",
      perluDiperiksa: true,
      didaftarkanOlehId: pic.id,
      timId: tim.id,
    },
    select: { id: true, fullName: true },
  });

  // Sengaja tanpa notifikasi sendiri: 20 freelance = 20 notifikasi. Absennya yang memberi tahu
  // owner (paling banyak sekali per sesi per 30 menit), dan halaman Absen Tim menampilkan
  // bagian "Freelance baru".

  return json({ ok: true, id: e.id, nama: e.fullName, freelanceBaru: true }, { status: 201 });
});
