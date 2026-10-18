import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, route } from "@/lib/http";
import { rapikanWarna } from "@/lib/services/tim-kerja-admin/aturan";
import { daftarTimAdmin, pasangPic, unikBentrok } from "@/lib/services/tim-kerja-admin/layanan";
import { timBaruSchema } from "@/lib/services/tim-kerja-admin/skema";

/** `{ tim: [...], karyawan: [...] }` — semua tim beserta anggotanya, dan karyawan aktif. */
export const GET = route(async () => {
  await requireManager();
  return json(await daftarTimAdmin(prisma));
});

/** Buat tim. `picId` opsional — kalau diisi, dia sekaligus dimasukkan ke tim dan boleh absenkan tim. */
export const POST = route(async (req: Request) => {
  await requireManager();
  const parsed = timBaruSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const d = parsed.data;

  let timId: number;
  try {
    const t = await prisma.timKerja.create({
      data: {
        nama: d.nama.replace(/\s+/g, " "),
        warna: rapikanWarna(d.warna),
        aktif: d.aktif ?? true,
        catatan: d.catatan?.trim() || null,
      },
    });
    timId = t.id;
  } catch (e) {
    if (unikBentrok(e)) return json({ message: `Nama tim "${d.nama}" sudah dipakai.` }, { status: 409 });
    throw e;
  }

  let peringatan: string | null = null;
  if (d.picId) {
    const pic = await pasangPic(prisma, timId, d.picId);
    // Tim tetap jadi walau PIC ditolak — kepala tim bisa dipilih ulang dari daftar.
    peringatan = pic.ok ? pic.peringatan : `Tim dibuat, tapi PIC belum terpasang: ${pic.pesan}`;
  }
  return json({ id: timId, peringatan }, { status: 201 });
});
