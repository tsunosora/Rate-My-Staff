import ExcelJS from "exceljs";

export type AssessmentRow = {
  id: number;
  assessmentDate: Date | string;
  period: string | null;
  totalScore: unknown;
  grade: string | null;
  employee: { fullName: string; employeeCode: string; department: { name: string } | null };
  template: { name: string };
};

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
  });
}

export async function buildAssessmentReportExcel(rows: AssessmentRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Laporan Penilaian");
  ws.columns = [
    { header: "Tanggal", key: "date", width: 14 },
    { header: "Kode", key: "code", width: 16 },
    { header: "Nama", key: "name", width: 28 },
    { header: "Departemen", key: "dept", width: 20 },
    { header: "Template", key: "tpl", width: 24 },
    { header: "Periode", key: "period", width: 14 },
    { header: "Skor", key: "score", width: 10 },
    { header: "Grade", key: "grade", width: 16 },
  ];
  styleHeader(ws.getRow(1));
  for (const r of rows) {
    ws.addRow({
      date: new Date(r.assessmentDate).toISOString().slice(0, 10),
      code: r.employee.employeeCode,
      name: r.employee.fullName,
      dept: r.employee.department?.name ?? "-",
      tpl: r.template.name,
      period: r.period ?? "-",
      score: Number(r.totalScore ?? 0),
      grade: r.grade ?? "-",
    });
  }
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export type AttendanceReportRow = {
  date: string;
  fullName: string;
  department: string | null;
  clockIn: string | null;
  clockOut: string | null;
  lateMinutes: number;
  overtimeMinutes: number;
  status: string;
};

export async function buildAttendanceReportExcel(
  rows: AttendanceReportRow[]
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Detail Absensi");
  ws.columns = [
    { header: "Tanggal", key: "date", width: 14 },
    { header: "Nama", key: "name", width: 28 },
    { header: "Departemen", key: "dept", width: 20 },
    { header: "Masuk", key: "in", width: 10 },
    { header: "Pulang", key: "out", width: 10 },
    { header: "Telat (m)", key: "late", width: 10 },
    { header: "Lembur (m)", key: "ot", width: 12 },
    { header: "Status", key: "status", width: 12 },
  ];
  styleHeader(ws.getRow(1));
  for (const r of rows) {
    ws.addRow({
      date: r.date,
      name: r.fullName,
      dept: r.department ?? "-",
      in: r.clockIn ?? "-",
      out: r.clockOut ?? "-",
      late: r.lateMinutes,
      ot: r.overtimeMinutes,
      status: r.status,
    });
  }
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
