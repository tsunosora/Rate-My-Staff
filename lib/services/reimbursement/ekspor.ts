import ExcelJS from "exceljs";
import { LABEL_STATUS, jumlahBerlaku, type StatusReimburse } from "./aturan";

export type BarisEkspor = {
  tanggal: string;
  employeeCode: string;
  employeeName: string;
  department: string | null;
  kategoriLabel: string;
  keterangan: string;
  jumlah: number;
  jumlahDisetujui: number | null;
  status: string;
  dibayarAt: Date | null;
  catatanKeputusan: string | null;
};

const RUPIAH = '"Rp"#,##0';

type Total = { nama: string; kode: string; diajukan: number; disetujui: number; dibayar: number };

/** Rekap reimbursement satu periode: lembar rincian + lembar total per karyawan. */
export async function bangunEksporReimbursement(rows: BarisEkspor[], judul: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Rincian");
  ws.columns = [
    { header: "Tanggal", key: "tanggal", width: 12 },
    { header: "Kode", key: "kode", width: 14 },
    { header: "Nama", key: "nama", width: 26 },
    { header: "Departemen", key: "dept", width: 18 },
    { header: "Kategori", key: "kategori", width: 12 },
    { header: "Keterangan", key: "ket", width: 40 },
    { header: "Diajukan", key: "jumlah", width: 14, style: { numFmt: RUPIAH } },
    { header: "Disetujui", key: "disetujui", width: 14, style: { numFmt: RUPIAH } },
    { header: "Status", key: "status", width: 12 },
    { header: "Dibayar", key: "dibayar", width: 12 },
    { header: "Catatan owner", key: "catatan", width: 30 },
  ];
  const kepala = ws.getRow(1);
  kepala.font = { bold: true };
  kepala.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
  });

  const perKaryawan = new Map<string, Total>();
  for (const r of rows) {
    ws.addRow({
      tanggal: r.tanggal,
      kode: r.employeeCode,
      nama: r.employeeName,
      dept: r.department ?? "-",
      kategori: r.kategoriLabel,
      ket: r.keterangan,
      jumlah: r.jumlah,
      disetujui: r.jumlahDisetujui ?? null,
      status: LABEL_STATUS[r.status as StatusReimburse] ?? r.status,
      dibayar: r.dibayarAt ? r.dibayarAt.toISOString().slice(0, 10) : "",
      catatan: r.catatanKeputusan ?? "",
    });
    const k = perKaryawan.get(r.employeeCode) ?? {
      nama: r.employeeName,
      kode: r.employeeCode,
      diajukan: 0,
      disetujui: 0,
      dibayar: 0,
    };
    k.diajukan += r.jumlah;
    if (r.status === "disetujui" || r.status === "dibayar") k.disetujui += jumlahBerlaku(r);
    if (r.status === "dibayar") k.dibayar += jumlahBerlaku(r);
    perKaryawan.set(r.employeeCode, k);
  }

  const ws2 = wb.addWorksheet("Per karyawan");
  ws2.getColumn(1).width = 14;
  ws2.getColumn(2).width = 26;
  for (const c of [3, 4, 5]) {
    ws2.getColumn(c).width = 16;
    ws2.getColumn(c).numFmt = RUPIAH;
  }
  ws2.addRow([judul]).font = { bold: true };
  ws2.addRow([]);
  ws2.addRow(["Kode", "Nama", "Total diajukan", "Total disetujui", "Sudah dibayar"]).font = { bold: true };
  for (const k of [...perKaryawan.values()].sort((a, b) => a.nama.localeCompare(b.nama))) {
    ws2.addRow([k.kode, k.nama, k.diajukan, k.disetujui, k.dibayar]);
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
