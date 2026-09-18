import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireManager, json, badRequest, notFound, route } from "@/lib/http";
import { leaveDecisionSchema } from "@/lib/validators/portal";
import { applyApprovedLeave, revertApprovedLeave, toYmd } from "@/lib/services/leave/service";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Keputusan owner/manajemen atas satu pengajuan izin.
 * - approve : tandai disetujui lalu tulis ketidakhadiran ke absensi (hari yang sudah ada scan dilewati).
 * - reject  : tandai ditolak; absensi tidak disentuh.
 * - cancel  : batalkan; bila sebelumnya disetujui, baris absensi hasil persetujuan ditarik kembali.
 */
export const PATCH = route<Ctx>(async (req, ctx) => {
  const session = await requireManager();
  const { id } = await ctx.params;

  const parsed = leaveDecisionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const { action, note } = parsed.data;

  const request = await prisma.leaveRequest.findUnique({ where: { id: Number(id) } });
  if (!request) return notFound("Pengajuan tidak ditemukan");

  if (action !== "cancel" && request.status !== "pending") {
    return NextResponse.json(
      { message: `Pengajuan sudah berstatus "${request.status}".` },
      { status: 409 }
    );
  }
  if (action === "cancel" && (request.status === "cancelled" || request.status === "rejected")) {
    return NextResponse.json({ message: "Pengajuan ini tidak aktif." }, { status: 409 });
  }

  const decider = session.user?.email
    ? await prisma.user.findUnique({ where: { email: session.user.email }, select: { id: true } })
    : null;

  // Tarik kembali absensi dulu bila membatalkan persetujuan yang sudah tertulis.
  let reverted = 0;
  if (action === "cancel" && request.status === "approved") {
    reverted = await revertApprovedLeave(prisma, request);
  }

  const status = action === "approve" ? "approved" : action === "reject" ? "rejected" : "cancelled";
  const updated = await prisma.leaveRequest.update({
    where: { id: request.id },
    data: {
      status,
      decisionNote: note?.trim() ? note.trim() : null,
      decidedById: decider?.id ?? null,
      decidedAt: new Date(),
    },
  });

  const result = action === "approve" ? await applyApprovedLeave(prisma, updated) : null;

  return json({
    ok: true,
    status,
    startDate: toYmd(updated.startDate),
    endDate: toYmd(updated.endDate),
    applied: result?.applied ?? 0,
    /** Tanggal yang tidak ditulis karena sudah ada scan mesin/manual di hari itu. */
    skipped: result?.skipped ?? [],
    reverted,
  });
});
