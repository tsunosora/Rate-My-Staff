import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { AssessmentRow } from "./excel";

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 9, fontFamily: "Helvetica" },
  title: { fontSize: 16, marginBottom: 4, fontFamily: "Helvetica-Bold" },
  sub: { fontSize: 9, color: "#64748b", marginBottom: 12 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingVertical: 4 },
  head: { flexDirection: "row", backgroundColor: "#e2e8f0", paddingVertical: 5, fontFamily: "Helvetica-Bold" },
  cDate: { width: "14%" },
  cName: { width: "28%" },
  cDept: { width: "20%" },
  cPeriod: { width: "14%" },
  cScore: { width: "10%" },
  cGrade: { width: "14%" },
});

function ReportDoc({ rows, generatedAt }: { rows: AssessmentRow[]; generatedAt: string }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Laporan Penilaian Karyawan</Text>
        <Text style={styles.sub}>Dibuat: {generatedAt} — {rows.length} penilaian</Text>
        <View style={styles.head}>
          <Text style={styles.cDate}>Tanggal</Text>
          <Text style={styles.cName}>Nama</Text>
          <Text style={styles.cDept}>Departemen</Text>
          <Text style={styles.cPeriod}>Periode</Text>
          <Text style={styles.cScore}>Skor</Text>
          <Text style={styles.cGrade}>Grade</Text>
        </View>
        {rows.map((r) => (
          <View style={styles.row} key={r.id}>
            <Text style={styles.cDate}>{new Date(r.assessmentDate).toISOString().slice(0, 10)}</Text>
            <Text style={styles.cName}>{r.employee.fullName}</Text>
            <Text style={styles.cDept}>{r.employee.department?.name ?? "-"}</Text>
            <Text style={styles.cPeriod}>{r.period ?? "-"}</Text>
            <Text style={styles.cScore}>{Number(r.totalScore ?? 0).toFixed(2)}</Text>
            <Text style={styles.cGrade}>{r.grade ?? "-"}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}

export async function buildAssessmentReportPdf(
  rows: AssessmentRow[],
  generatedAt: string
): Promise<Buffer> {
  return renderToBuffer(<ReportDoc rows={rows} generatedAt={generatedAt} />);
}
