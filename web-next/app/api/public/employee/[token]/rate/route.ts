import { prisma } from "@/lib/prisma";
import { json, badRequest, notFound, route } from "@/lib/http";
import { NextResponse } from "next/server";
import { publicRateSchema } from "@/lib/validators/public";
import { gradeFromScore } from "@/lib/services/grade";

type Ctx = { params: Promise<{ token: string }> };

// PUBLIK — simpan rating tamu sebagai Assessment isPublic (evaluatorId null, skor = rating).
export const POST = route<Ctx>(async (req, ctx) => {
  const { token } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = publicRateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const employee = await prisma.employee.findFirst({
    where: { publicToken: token, deletedAt: null, isActive: true },
  });
  if (!employee) return notFound("Tautan tidak valid");

  // Butuh sebuah template (skema mewajibkan templateId). Pakai template pertama.
  const template = await prisma.assessmentTemplate.findFirst({ orderBy: { id: "asc" } });
  if (!template) {
    return NextResponse.json(
      { message: "Belum ada template penilaian. Hubungi admin." },
      { status: 409 }
    );
  }

  const rating = parsed.data.rating;
  await prisma.assessment.create({
    data: {
      employeeId: employee.id,
      templateId: template.id,
      evaluatorId: null,
      isPublic: true,
      assessmentDate: new Date(),
      totalScore: rating,
      grade: gradeFromScore(rating),
      raterName: parsed.data.raterName || "Guest",
      evaluatorNotes: parsed.data.feedback || null,
      status: "completed",
    },
  });

  return json({ ok: true }, { status: 201 });
});
