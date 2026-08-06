import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatHoursMinutes } from "@/lib/services/attendance/receipt";
import type { ReceiptData, ReceiptDayRow } from "@/lib/services/attendance/receipt";

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 8, fontFamily: "Helvetica" },
  title: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  sub: { fontSize: 8, color: "#64748b", marginBottom: 10 },
  head: { flexDirection: "row", backgroundColor: "#e2e8f0", paddingVertical: 4, fontFamily: "Helvetica-Bold" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingVertical: 3 },
  rowHoliday: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingVertical: 3, backgroundColor: "#fecaca" },
  cHari: { width: "11%", paddingHorizontal: 2 },
  cTgl: { width: "11%", paddingHorizontal: 2 },
  cJam: { width: "11%", paddingHorizontal: 2 },
  cShift: { width: "10%", paddingHorizontal: 2 },
  cNum: { width: "9%", paddingHorizontal: 2, textAlign: "right" },
  cSmall: { width: "7%", paddingHorizontal: 2, textAlign: "right" },
  cFNum: { width: "14%", paddingHorizontal: 2, textAlign: "right" },
  cFMeal: { width: "18%", paddingHorizontal: 2, textAlign: "right" },
  footer: { marginTop: 12, borderTopWidth: 1, borderTopColor: "#94a3b8", paddingTop: 6 },
  fRow: { flexDirection: "row", paddingVertical: 2 },
  fLabel: { width: "30%", fontFamily: "Helvetica-Bold" },
  fRate: { width: "20%", textAlign: "right" },
  fQty: { width: "20%", textAlign: "right" },
  fAmount: { width: "30%", textAlign: "right" },
  grand: { flexDirection: "row", paddingVertical: 4, marginTop: 4, borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  grandLabel: { width: "70%", fontFamily: "Helvetica-Bold", fontSize: 11 },
  grandAmount: { width: "30%", textAlign: "right", fontFamily: "Helvetica-Bold", fontSize: 11 },
  note: { marginTop: 10, fontSize: 7, color: "#94a3b8" },
});

function DayRow({ r, data }: { r: ReceiptDayRow; data: ReceiptData }) {
  const empty = r.isHoliday && !r.worked;
  return (
    <View style={empty ? styles.rowHoliday : styles.row}>
      <Text style={styles.cHari}>{r.dayName}</Text>
      <Text style={styles.cTgl}>{r.date}</Text>
      <Text style={styles.cJam}>{r.clockIn ?? ""}</Text>
      <Text style={styles.cJam}>{r.clockOut ?? ""}</Text>
      <Text style={styles.cShift}>{r.shiftLabel}</Text>
      {data.flexible ? (
        <>
          <Text style={styles.cFNum}>{r.overtimeMinutes ? formatHoursMinutes(r.overtimeMinutes) : ""}</Text>
          <Text style={styles.cFMeal}>{r.mealEligible ? rp(data.mealAllowance) : ""}</Text>
          <Text style={styles.cFNum}>{r.undertimeMinutes ? formatHoursMinutes(r.undertimeMinutes) : ""}</Text>
        </>
      ) : (
        <>
          <Text style={styles.cNum}>{r.lateMinutes || 0}</Text>
          <Text style={styles.cNum}>{r.overtimeHours ? r.overtimeHours.toFixed(2) : ""}</Text>
          <Text style={styles.cSmall}>{r.ls || ""}</Text>
          <Text style={styles.cSmall}>{r.lc ? r.lc.toFixed(2) : ""}</Text>
          <Text style={styles.cSmall}>{r.ll || ""}</Text>
        </>
      )}
    </View>
  );
}

function ReceiptPage({ data, generatedAt }: { data: ReceiptData; generatedAt: string }) {
  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.title}>{data.employeeName}</Text>
      <Text style={styles.sub}>
        {(data.department ?? "-") + " · " + data.monthLabel + (data.employeeCode ? " · " + data.employeeCode : "")}
      </Text>

      <View style={styles.head}>
        <Text style={styles.cHari}>Hari</Text>
        <Text style={styles.cTgl}>Tanggal</Text>
        <Text style={styles.cJam}>Masuk</Text>
        <Text style={styles.cJam}>Pulang</Text>
        <Text style={styles.cShift}>Shift</Text>
        {data.flexible ? (
          <>
            <Text style={styles.cFNum}>Lembur</Text>
            <Text style={styles.cFMeal}>{data.labels.meal}</Text>
            <Text style={styles.cFNum}>Kurang</Text>
          </>
        ) : (
          <>
            <Text style={styles.cNum}>Telat</Text>
            <Text style={styles.cNum}>Lembur</Text>
            <Text style={styles.cSmall}>LS</Text>
            <Text style={styles.cSmall}>LC</Text>
            <Text style={styles.cSmall}>LL</Text>
          </>
        )}
      </View>
      {data.rows.map((r) => (
        <DayRow key={r.date} r={r} data={data} />
      ))}

      <View style={styles.footer}>
        {data.flexible ? (
          <>
            <View style={styles.fRow}>
              <Text style={styles.fLabel}>{data.labels.flexOvertime}</Text>
              <Text style={styles.fRate}>{rp(Math.round(data.flexRatePerHour / 60))}/mnt</Text>
              <Text style={styles.fQty}>{data.totals.overtimeMinutes} mnt ({formatHoursMinutes(data.totals.overtimeMinutes)})</Text>
              <Text style={styles.fAmount}>{rp(data.totals.overtimeAmount)}</Text>
            </View>
            <View style={styles.fRow}>
              <Text style={styles.fLabel}>{data.labels.meal}</Text>
              <Text style={styles.fRate}>{rp(data.mealAllowance)}</Text>
              <Text style={styles.fQty}>{data.totals.mealCount}</Text>
              <Text style={styles.fAmount}>{rp(data.totals.mealAmount)}</Text>
            </View>
            {data.totals.undertimeMinutes > 0 && (
              <View style={styles.fRow}>
                <Text style={styles.fLabel}>Kekurangan jam</Text>
                <Text style={styles.fRate} />
                <Text style={styles.fQty}>{formatHoursMinutes(data.totals.undertimeMinutes)}</Text>
                <Text style={styles.fAmount}>—</Text>
              </View>
            )}
          </>
        ) : (
          <>
            <View style={styles.fRow}>
              <Text style={styles.fLabel}>{data.labels.daily}</Text>
              <Text style={styles.fRate}>{rp(data.rates.daily)}</Text>
              <Text style={styles.fQty}>{data.totals.lsCount}</Text>
              <Text style={styles.fAmount}>{rp(data.totals.dailyAmount)}</Text>
            </View>
            <View style={styles.fRow}>
              <Text style={styles.fLabel}>{data.labels.holiday}</Text>
              <Text style={styles.fRate}>{rp(data.rates.holiday)}</Text>
              <Text style={styles.fQty}>{data.totals.llCount}</Text>
              <Text style={styles.fAmount}>{rp(data.totals.holidayAmount)}</Text>
            </View>
            <View style={styles.fRow}>
              <Text style={styles.fLabel}>{data.labels.cetak}</Text>
              <Text style={styles.fRate}>{rp(data.rates.cetak)}</Text>
              <Text style={styles.fQty}>{data.totals.lcHours.toFixed(2)}</Text>
              <Text style={styles.fAmount}>{rp(data.totals.cetakAmount)}</Text>
            </View>
          </>
        )}
        <View style={styles.grand}>
          <Text style={styles.grandLabel}>Jumlah</Text>
          <Text style={styles.grandAmount}>{rp(data.totals.grandTotal)}</Text>
        </View>
      </View>
      <Text style={styles.note}>Struk absensi · dibuat {generatedAt}</Text>
    </Page>
  );
}

/** Bangun PDF struk: satu halaman A4 per karyawan (massal = banyak halaman). */
export async function buildReceiptPdf(receipts: ReceiptData[], generatedAt: string): Promise<Buffer> {
  return renderToBuffer(
    <Document>
      {receipts.map((d) => (
        <ReceiptPage key={`${d.employeeId}-${d.year}-${d.month}`} data={d} generatedAt={generatedAt} />
      ))}
    </Document>
  );
}
