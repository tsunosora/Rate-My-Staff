import { prisma } from "@/lib/prisma";
import { json, route } from "@/lib/http";
import { requirePortalOwner } from "@/lib/services/portal/auth";
import { selesaiKunjunganSchema } from "@/lib/validators/kunjungan";
import { durasiMenit, jarakMasukKeluar, putuskanSelesai } from "@/lib/services/kunjungan/aturan";

type Ctx = { params: Promise<{ token: string; id: string }> };

/** PORTAL (sesi PIN karyawan) — selesaikan kunjungan miliknya sendiri: GPS + hasil + catatan. */
export const PATCH = route<Ctx>(async (req, ctx) => {
  const { token, id: idMentah } = await ctx.params;
  const employee = await requirePortalOwner(token, req);
  const id = Number(idMentah);

  const p = selesaiKunjunganSchema.safeParse(await req.json().catch(() => null));
  if (!p.success) {
    return json({ ok: false, kode: "isian", alasan: p.error.issues[0]?.message ?? "Isian belum lengkap." }, { status: 422 });
  }

  // Dicari bersama employeeId: id milik karyawan lain dijawab "tidak ditemukan", bukan dibuka.
  const kunjungan =
    Number.isInteger(id) && id > 0
      ? await prisma.kunjunganKlien.findFirst({
          where: { id, employeeId: employee.id },
          select: { id: true, masukAt: true, keluarAt: true },
        })
      : null;

  const now = Date.now();
  const keputusan = putuskanSelesai({
    kunjungan,
    titik: { lat: p.data.lat, lng: p.data.lng, akurasiM: p.data.akurasi },
    hasil: p.data.hasil,
    nowMs: now,
  });
  if (!keputusan.ok || !kunjungan) {
    const status = !kunjungan ? 404 : 422;
    return json(keputusan, { status });
  }

  // Bersyarat keluarAt null: dua ketukan "Selesai" serentak tidak saling menimpa.
  const r = await prisma.kunjunganKlien.updateMany({
    where: { id: kunjungan.id, employeeId: employee.id, keluarAt: null },
    data: {
      keluarAt: new Date(now),
      keluarLat: p.data.lat,
      keluarLng: p.data.lng,
      keluarAkurasiM: Math.round(p.data.akurasi),
      hasil: keputusan.hasil,
      catatan: p.data.catatan,
    },
  });
  if (r.count === 0) {
    return json({ ok: false, kode: "sudah_selesai", alasan: "Kunjungan ini sudah diselesaikan." }, { status: 409 });
  }

  const k = await prisma.kunjunganKlien.findUniqueOrThrow({
    where: { id: kunjungan.id },
    select: { masukAt: true, keluarAt: true, masukLat: true, masukLng: true, keluarLat: true, keluarLng: true },
  });
  return json({ ok: true, durasiMenit: durasiMenit(k.masukAt, k.keluarAt), jarakM: jarakMasukKeluar(k) });
});
