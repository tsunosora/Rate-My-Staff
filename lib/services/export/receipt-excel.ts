import ExcelJS from "exceljs";
import type { ReceiptData } from "@/lib/services/attendance/receipt";

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

function addSheet(wb: ExcelJS.Workbook, data: ReceiptData, idx: number) {
  const safe = `${data.employeeCode || data.employeeId}`.replace(/[\\/*?:[\]]/g, "").slice(0, 24);
  const ws = wb.addWorksheet(`${safe}-${idx + 1}`.slice(0, 31));

  const title = ws.addRow([data.employeeName]);
  title.font = { bold: true, size: 14 };
  ws.addRow([`${data.department ?? "-"} · ${data.monthLabel}`]);
  ws.addRow([]);

  const head = ws.addRow(
    data.flexible
      ? ["Hari", "Tanggal", "Masuk", "Pulang", "Shift", "Lembur", data.labels.meal, "Kurang"]
      : ["Hari", "Tanggal", "Masuk", "Pulang", "Shift", "Terlambat", "Lembur", "LS", "LC", "LL"]
  );
  head.font = { bold: true };
  head.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
  });

  for (const r of data.rows) {
    const row = ws.addRow(
      data.flexible
        ? [
            r.dayName,
            r.date,
            r.clockIn ?? "",
            r.clockOut ?? "",
            r.shiftLabel,
            r.overtimeHours || "",
            r.mealEligible ? data.mealAllowance : "",
            r.undertimeMinutes ? Number((r.undertimeMinutes / 60).toFixed(2)) : "",
          ]
        : [
            r.dayName,
            r.date,
            r.clockIn ?? "",
            r.clockOut ?? "",
            r.shiftLabel,
            r.lateMinutes || 0,
            r.overtimeHours || "",
            r.ls || "",
            r.lc || "",
            r.ll || "",
          ]
    );
    if (r.isHoliday && !r.worked) {
      row.eachCell({ includeEmpty: true }, (c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFC7CE" } };
      });
    }
  }

  ws.addRow([]);
  if (data.flexible) {
    ws.addRow([
      data.labels.flexOvertime,
      rp(data.flexRatePerHour),
      Number((data.totals.overtimeMinutes / 60).toFixed(2)),
      rp(data.totals.overtimeAmount),
    ]);
    ws.addRow([data.labels.meal, rp(data.mealAllowance), data.totals.mealCount, rp(data.totals.mealAmount)]);
    if (data.totals.undertimeMinutes > 0) {
      ws.addRow(["Kekurangan jam", "", Number((data.totals.undertimeMinutes / 60).toFixed(2)), "—"]);
    }
  } else {
    ws.addRow([data.labels.daily, rp(data.rates.daily), data.totals.lsCount, rp(data.totals.dailyAmount)]);
    ws.addRow([data.labels.holiday, rp(data.rates.holiday), data.totals.llCount, rp(data.totals.holidayAmount)]);
    ws.addRow([data.labels.cetak, rp(data.rates.cetak), data.totals.lcHours, rp(data.totals.cetakAmount)]);
  }
  const tot = ws.addRow(["Jumlah", "", "", rp(data.totals.grandTotal)]);
  tot.font = { bold: true };

  ws.columns.forEach((c) => (c.width = 12));
}

/** Bangun workbook Excel struk: satu worksheet per karyawan. */
export async function buildReceiptExcel(receipts: ReceiptData[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  receipts.forEach((r, i) => addSheet(wb, r, i));
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
