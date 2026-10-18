import ExcelJS from "exceljs";
import type { UpahOrang } from "./data";
import { LABEL_BAYAR, LABEL_JENIS, LABEL_STATUS, labelSumber } from "./label";

const RUPIAH = '"Rp"#,##0;-"Rp"#,##0';

function kepala(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
  });
}

/** Ekspor rekap upah satu periode: lembar ringkasan per orang + lembar rincian harian + penyesuaian. */
export async function buatEksporUpah(orang: UpahOrang[], dari: string, sampai: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();

  const ws = wb.addWorksheet("Rekap upah");
  ws.addRow([`Rekap upah ${dari} s/d ${sampai}`]).font = { bold: true, size: 13 };
  ws.addRow([]);
  const kolom = [
    ["Kode", 12], ["Nama", 28], ["Tim", 18], ["Hadir", 8], ["½ hari", 8], ["Absen", 8], ["Lembur (jam)", 12],
    ["Upah pokok", 15], ["Lembur Rp", 14], ["Upah khusus", 14], ["Penyesuaian", 14], ["Total", 16],
    ["Belum dibayar", 16], ["Status", 16], ["Menunggu persetujuan", 12], ["Tarif belum diatur", 12],
  ] as const;
  kolom.forEach(([, w], i) => (ws.getColumn(i + 1).width = w));
  kepala(ws.addRow(kolom.map(([h]) => h)));
  let total = 0;
  for (const o of orang) {
    const r = o.hitungan.ringkas;
    total += r.total;
    ws.addRow([
      o.kode, o.nama, o.tim?.nama ?? "", r.hadir, r.setengah, r.absen, r.lemburJam,
      r.upahPokok, r.upahLembur, r.upahKhusus, r.penyesuaian, r.total,
      o.belumDibayar.ringkas.total, LABEL_BAYAR[o.statusBayar], o.menunggu, r.tarifKosong,
    ]);
  }
  const akhir = ws.addRow(["", "Jumlah", "", "", "", "", "", "", "", "", "", total]);
  akhir.font = { bold: true };
  for (const c of [8, 9, 10, 11, 12, 13]) ws.getColumn(c).numFmt = RUPIAH;

  const wr = wb.addWorksheet("Rincian harian");
  const kr = [
    ["Tanggal", 12], ["Kode", 12], ["Nama", 28], ["Status", 10], ["Lembur (jam)", 12], ["Proyek", 22], ["Kota", 16],
    ["Divisi", 16], ["Tarif dari", 14], ["Upah harian", 14], ["Lembur/jam", 12], ["Upah pokok", 14], ["Lembur Rp", 14],
    ["Upah khusus", 14], ["Upah", 14], ["Dibayar", 10],
  ] as const;
  kr.forEach(([, w], i) => (wr.getColumn(i + 1).width = w));
  kepala(wr.addRow(kr.map(([h]) => h)));
  for (const o of orang) {
    for (const b of o.hitungan.baris) {
      wr.addRow([
        b.tanggal, o.kode, o.nama, LABEL_STATUS[b.status], b.lemburJam, b.proyek ?? "", b.kota ?? "", b.divisi ?? "",
        labelSumber(b.sumberTarif), b.upahHarian, b.lemburPerJam, b.upahPokok, b.upahLembur, b.upahKhusus, b.upah,
        b.pembayaranId != null ? "Ya" : "",
      ]);
    }
  }
  for (const c of [10, 11, 12, 13, 14, 15]) wr.getColumn(c).numFmt = RUPIAH;

  const wp = wb.addWorksheet("Penyesuaian");
  const kp = [["Tanggal", 12], ["Kode", 12], ["Nama", 28], ["Jenis", 12], ["Jumlah", 14], ["Catatan", 36], ["Dibayar", 10]] as const;
  kp.forEach(([, w], i) => (wp.getColumn(i + 1).width = w));
  kepala(wp.addRow(kp.map(([h]) => h)));
  for (const o of orang) {
    for (const p of o.hitungan.penyesuaian) {
      wp.addRow([p.tanggal, o.kode, o.nama, LABEL_JENIS[p.jenis], p.nilai, p.catatan ?? "", p.pembayaranId != null ? "Ya" : ""]);
    }
  }
  wp.getColumn(5).numFmt = RUPIAH;

  return Buffer.from(await wb.xlsx.writeBuffer());
}
