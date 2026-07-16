import { prisma } from "@/lib/prisma";
import { requireSession, route } from "@/lib/http";
import { buildAssessmentWhere } from "@/lib/services/report-filters";
import { buildAssessmentReportExcel } from "@/lib/services/export/excel";

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
  const buffer = await buildAssessmentReportExcel(rows);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="laporan-penilaian.xlsx"`,
    },
  });
});
