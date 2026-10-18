import ExcelJS from "exceljs";
import { labelHasil, type RingkasanKaryawan } from "./aturan";
import type { bentukBaris } from "./data";

type Baris = ReturnType<typeof bentukBaris>;

const STATUS: Record<string, string> = { berjalan: "Sedang berjalan", selesai: "Selesai", tidak_selesai: "Tidak diselesaikan" };

function kepala(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
  });
}

const tgl = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { year: "numeric", month: "2-digit", day: "2-digit" });
const jam = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "";

export async function bukuKunjungan(baris: Baris[], ringkasan: RingkasanKaryawan[], judul: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();

  const ws = wb.addWorksheet("Kunjungan");
  ws.columns = [
    { header: "Tanggal", key: "tgl", width: 12 },
    { header: "Karyawan", key: "nama", width: 24 },
    { header: "Kode", key: "kode", width: 12 },
    { header: "Klien", key: "klien", width: 26 },
    { header: "Alamat", key: "alamat", width: 28 },
    { header: "Tujuan", key: "tujuan", width: 24 },
    { header: "Mulai", key: "mulai", width: 8 },
    { header: "Selesai", key: "selesai", width: 8 },
    { header: "Durasi (menit)", key: "durasi", width: 13 },
    { header: "Jarak mulai–selesai (m)", key: "jarak", width: 20 },
    { header: "Hasil", key: "hasil", width: 16 },
    { header: "Catatan", key: "catatan", width: 32 },
    { header: "Status", key: "status", width: 18 },
    { header: "Penanda", key: "penanda", width: 32 },
    { header: "Peta mulai", key: "petaMasuk", width: 22 },
    { header: "Peta selesai", key: "petaKeluar", width: 22 },
  ];
  kepala(ws.getRow(1));
  for (const b of baris) {
    const row = ws.addRow({
      tgl: tgl(b.masukAt),
      nama: b.nama,
      kode: b.kode,
      klien: b.namaKlien,
      alamat: b.alamat ?? "",
      tujuan: b.tujuan ?? "",
      mulai: jam(b.masukAt),
      selesai: jam(b.keluarAt),
      durasi: b.durasiMenit ?? "",
      jarak: b.jarakM ?? "",
      hasil: b.hasil ? labelHasil(b.hasil) : "",
      catatan: b.catatan ?? "",
      status: STATUS[b.status] ?? b.status,
      penanda: b.penanda.map((p) => p.label).join("; "),
      petaMasuk: { text: "Buka peta", hyperlink: b.petaMasuk },
      petaKeluar: b.petaKeluar ? { text: "Buka peta", hyperlink: b.petaKeluar } : "",
    });
    if (b.penanda.length > 0) row.getCell("penanda").font = { color: { argb: "FFB45309" } };
  }

  const wr = wb.addWorksheet("Ringkasan");
  wr.addRow([judul]).font = { bold: true };
  wr.addRow([]);
  wr.columns = [
    { key: "nama", width: 26 },
    { key: "jumlah", width: 12 },
    { key: "selesai", width: 12 },
    { key: "durasi", width: 16 },
    { key: "deal", width: 10 },
    { key: "ditandai", width: 12 },
  ];
  kepala(wr.addRow(["Karyawan", "Kunjungan", "Selesai", "Total durasi (menit)", "Deal", "Ditandai"]));
  for (const r of ringkasan) wr.addRow([r.nama, r.jumlah, r.selesai, r.totalMenit, r.deal, r.ditandai]);

  return Buffer.from(await wb.xlsx.writeBuffer());
}
