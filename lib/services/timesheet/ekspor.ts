import ExcelJS from "exceljs";
import type { Rekap } from "./service";

export type BarisEkspor = {
  tanggal: string;
  mulai: string;
  selesai: string;
  menit: number;
  proyek: string;
  kegiatan: string;
  catatan: string | null;
  sumber: string;
  employeeName: string;
  employeeCode: string;
};

function gayaKepala(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
  });
}

/** Menit -> jam desimal (2 angka), supaya bisa dijumlah langsung di Excel. */
const jam = (menit: number) => Math.round((menit / 60) * 100) / 100;
const persen = (p: number | null) => (p === null ? "-" : `${p}%`);

/** Tiga lembar: entri, rekap per karyawan per hari, rekap per proyek. */
export async function bangunEksporTimesheet(baris: BarisEkspor[], rekap: Rekap): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();

  const ws = wb.addWorksheet("Entri");
  ws.columns = [
    { header: "Tanggal", key: "tanggal", width: 12 },
    { header: "Kode", key: "kode", width: 14 },
    { header: "Nama", key: "nama", width: 26 },
    { header: "Mulai", key: "mulai", width: 8 },
    { header: "Selesai", key: "selesai", width: 8 },
    { header: "Jam", key: "jam", width: 8 },
    { header: "Proyek", key: "proyek", width: 24 },
    { header: "Kegiatan", key: "kegiatan", width: 40 },
    { header: "Catatan", key: "catatan", width: 30 },
    { header: "Dicatat lewat", key: "sumber", width: 14 },
  ];
  gayaKepala(ws.getRow(1));
  for (const b of baris) {
    ws.addRow({
      tanggal: b.tanggal,
      kode: b.employeeCode,
      nama: b.employeeName,
      mulai: b.mulai,
      selesai: b.selesai,
      jam: jam(b.menit),
      proyek: b.proyek || "(tanpa proyek)",
      kegiatan: b.kegiatan,
      catatan: b.catatan ?? "",
      sumber: b.sumber === "admin" ? "owner" : "karyawan",
    });
  }

  const wk = wb.addWorksheet("Per karyawan");
  wk.columns = [
    { header: "Nama", key: "nama", width: 26 },
    { header: "Kode", key: "kode", width: 14 },
    { header: "Tanggal", key: "tanggal", width: 12 },
    { header: "Jam tercatat", key: "tercatat", width: 13 },
    { header: "Jam hadir", key: "hadir", width: 11 },
    { header: "Tercatat", key: "persen", width: 10 },
  ];
  gayaKepala(wk.getRow(1));
  for (const r of rekap.perKaryawan) {
    for (const h of r.hari) {
      wk.addRow({ nama: r.nama, kode: r.kode, tanggal: h.tanggal, tercatat: jam(h.tercatat), hadir: jam(h.hadir), persen: persen(h.persen) });
    }
    const total = wk.addRow({ nama: r.nama, kode: r.kode, tanggal: "TOTAL", tercatat: jam(r.tercatat), hadir: jam(r.hadir), persen: persen(r.persen) });
    total.font = { bold: true };
  }

  const wp = wb.addWorksheet("Per proyek");
  wp.columns = [
    { header: "Proyek", key: "proyek", width: 26 },
    { header: "Jam", key: "jam", width: 10 },
    { header: "Entri", key: "entri", width: 8 },
    { header: "Karyawan (jam)", key: "orang", width: 60 },
  ];
  gayaKepala(wp.getRow(1));
  for (const p of rekap.perProyek) {
    wp.addRow({
      proyek: p.proyek || "(tanpa proyek)",
      jam: jam(p.menit),
      entri: p.jumlahEntri,
      orang: p.karyawan.map((k) => `${k.nama} (${jam(k.menit)})`).join(", "),
    });
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
