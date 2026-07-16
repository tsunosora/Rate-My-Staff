import { prisma } from "@/lib/prisma";
import { requireSession, route } from "@/lib/http";
import { buildAssessmentWhere } from "@/lib/services/report-filters";
import { buildAssessmentReportPdf } from "@/lib/services/export/pdf";

export const GET = route(async (req: Request) => {
  await requireSession();
  const sp = new URL(req.url).searchParams;
  const rows = await prisma.assessment.findMany({
    where: buildAssessmentWhere(sp),
    orderBy: { assessmentDate: "desc" },
    include: {
      employee: { include: { department: true } },
      template: { select: { name: true } },
    },
  });
  const generatedAt = new Date().toISOString().slice(0, 16).replace("T", " ");
  const buffer = await buildAssessmentReportPdf(rows, generatedAt);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="laporan-penilaian.pdf"`,
    },
  });
});
