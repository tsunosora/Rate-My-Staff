import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, notFound, route } from "@/lib/http";
import { keputusanSchema } from "@/lib/validators/reimbursement";
import { rencanakan } from "@/lib/services/reimbursement/aturan";
import { idPengguna, serialisasi } from "@/lib/services/reimbursement/service";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Keputusan owner atas satu klaim: setujui (boleh mengurangi jumlah), tolak (catatan wajib),
 * bayar (dari disetujui), buka (batalkan keputusan selama belum dibayar). Aturan transisinya
 * di lib/services/reimbursement/aturan.ts → rencanakan().
 */
export const PATCH = route<Ctx>(async (req, ctx) => {
  const session = await requireManager();
  const id = Number((await ctx.params).id) || 0;

  const parsed = keputusanSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const klaim = await prisma.reimbursement.findUnique({ where: { id } });
  if (!klaim) return notFound("Klaim tidak ditemukan.");

  const hasil = rencanakan({
    status: klaim.status,
    jumlah: Number(klaim.jumlah),
    aksi: parsed.data.aksi,
    jumlahDisetujui: parsed.data.jumlahDisetujui ?? null,
    catatan: parsed.data.catatan ?? null,
    now: new Date(),
  });
  if (!hasil.ok) return NextResponse.json({ message: hasil.error }, { status: 409 });
  const r = hasil.rencana;

  const data: Prisma.ReimbursementUncheckedUpdateManyInput = { status: r.status };
  if (r.jumlahDisetujui !== undefined) data.jumlahDisetujui = r.jumlahDisetujui;
  if (r.catatanKeputusan !== undefined) data.catatanKeputusan = r.catatanKeputusan;
  if (r.dibayarAt !== undefined) data.dibayarAt = r.dibayarAt;
  if (r.pemutus === "isi") {
    data.decidedAt = new Date();
    data.decidedById = await idPengguna(session.user?.email);
  } else if (r.pemutus === "kosongkan") {
    data.decidedAt = null;
    data.decidedById = null;
  }

  // updateMany bersyarat status lama: dua owner yang memutus bersamaan tidak saling menimpa,
  // dan klaim yang baru saja dibatalkan karyawannya tidak "dihidupkan" lagi.
  const res = await prisma.reimbursement.updateMany({ where: { id, status: klaim.status }, data });
  if (res.count === 0) {
    return NextResponse.json({ message: "Klaim baru saja berubah. Muat ulang halaman." }, { status: 409 });
  }
  const baru = await prisma.reimbursement.findUnique({ where: { id } });
  return json(baru ? serialisasi(baru) : { ok: true });
});
