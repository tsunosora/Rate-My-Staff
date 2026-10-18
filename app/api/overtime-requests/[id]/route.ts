import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, notFound, route } from "@/lib/http";
import { lemburKeputusanSchema } from "@/lib/validators/lembur";
import { toYmd } from "@/lib/services/leave/service";
import {
  terapkanLembur,
  tarikLembur,
  PESAN_BELUM_ADA_PULANG,
} from "@/lib/services/lembur/service";

type Ctx = { params: Promise<{ id: string }> };

function konflik(message: string) {
  return NextResponse.json({ message }, { status: 409 });
}

/**
 * Keputusan owner atas satu pengajuan lembur.
 * - approve : setujui (boleh mengubah menit), lalu tulis ke approvedOvertimeMinutes baris pulang
 * - reject  : tolak; absensi tidak disentuh
 * - cancel  : batalkan; kalau sudah disetujui, menitnya ditarik dari baris pulang — hanya bila
 *             nilainya masih persis yang ditulis persetujuan ini (perubahan manual dibiarkan)
 * - reapply : tulis ulang menit yang disetujui ke baris pulang (mis. scan pulang baru masuk)
 */
export const PATCH = route<Ctx>(async (req, ctx) => {
  const session = await requireManager();
  const { id } = await ctx.params;

  const parsed = lemburKeputusanSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const { action, note } = parsed.data;

  const p = await prisma.pengajuanLembur.findUnique({ where: { id: Number(id) || 0 } });
  if (!p) return notFound("Pengajuan tidak ditemukan");
  const tanggal = toYmd(p.tanggal);

  if ((action === "approve" || action === "reject") && p.status !== "pending") {
    return konflik(`Pengajuan sudah berstatus "${p.status}".`);
  }
  if (action === "cancel" && p.status !== "pending" && p.status !== "approved") {
    return konflik("Pengajuan ini tidak aktif.");
  }
  if (action === "reapply" && p.status !== "approved") {
    return konflik("Hanya pengajuan yang disetujui yang bisa diterapkan ulang.");
  }

  const menitDitulis = p.menitDisetujui ?? p.menit;

  if (action === "reapply") {
    const terap = await terapkanLembur(prisma, { employeeId: p.employeeId, tanggal, menit: menitDitulis });
    return json({
      ok: true,
      status: p.status,
      penerapan: terap.status,
      peringatan: terap.status === "belum_ada_scan_pulang" ? PESAN_BELUM_ADA_PULANG : null,
    });
  }

  const decider = session.user?.email
    ? await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
    : null;
  const catatan = note?.trim() ? note.trim() : null;

  if (action === "cancel") {
    let peringatan: string | null = null;
    if (p.status === "approved") {
      const tarik = await tarikLembur(prisma, { employeeId: p.employeeId, tanggal, menit: menitDitulis });
      if (tarik.status === "dibiarkan") {
        peringatan = `Menit lembur di absensi tanggal ${tanggal} sudah diubah manual (${tarik.nilaiSekarang} menit), jadi tidak ditarik. Periksa di halaman Absensi kalau perlu.`;
      }
    }
    await prisma.pengajuanLembur.update({
      where: { id: p.id },
      data: {
        status: "cancelled",
        catatanKeputusan: catatan ?? p.catatanKeputusan,
        decidedById: decider?.id ?? null,
        decidedAt: new Date(),
      },
    });
    return json({ ok: true, status: "cancelled", peringatan });
  }

  if (action === "reject") {
    await prisma.pengajuanLembur.update({
      where: { id: p.id },
      data: {
        status: "rejected",
        catatanKeputusan: catatan,
        decidedById: decider?.id ?? null,
        decidedAt: new Date(),
      },
    });
    return json({ ok: true, status: "rejected", peringatan: null });
  }

  // approve
  const menit = parsed.data.menitDisetujui ?? p.menit;
  await prisma.pengajuanLembur.update({
    where: { id: p.id },
    data: {
      status: "approved",
      menitDisetujui: menit,
      catatanKeputusan: catatan,
      decidedById: decider?.id ?? null,
      decidedAt: new Date(),
    },
  });
  const terap = await terapkanLembur(prisma, { employeeId: p.employeeId, tanggal, menit });
  let peringatan: string | null = null;
  if (terap.status === "belum_ada_scan_pulang") peringatan = PESAN_BELUM_ADA_PULANG;
  else if (terap.nilaiLama > 0 && terap.nilaiLama !== menit) {
    peringatan = `Menit lembur disetujui di absensi sebelumnya ${terap.nilaiLama} menit, sekarang ${menit} menit.`;
  }
  return json({ ok: true, status: "approved", menitDisetujui: menit, penerapan: terap.status, peringatan });
});
