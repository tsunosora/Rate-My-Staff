import type { JenisPenyesuaian, StatusBayar, StatusRekap, SumberTarif } from "./hitung";

/** Label untuk layar, slip, dan ekspor — satu tempat, supaya ketiganya berbicara sama. */
export const LABEL_STATUS: Record<StatusRekap, string> = { hadir: "Hadir", setengah: "½ Hari", absen: "Absen" };

export const LABEL_JENIS: Record<JenisPenyesuaian, string> = {
  bonus: "Bonus",
  tunjangan: "Tunjangan",
  potongan: "Potongan",
  kasbon: "Kasbon",
};

export const LABEL_BAYAR: Record<StatusBayar, string> = {
  kosong: "-",
  belum: "Belum dibayar",
  sebagian: "Dibayar sebagian",
  lunas: "Lunas",
};

export function labelSumber(s: SumberTarif): string {
  return s === "proyek" ? "Proyek" : s === "kota_divisi" ? "Kota × divisi" : s === "karyawan" ? "Tarif orang" : "Belum diatur";
}

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

/** "2026-10-18" → "Min, 18 Okt 2026". */
export function tanggalPendek(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  return `${HARI[new Date(y, m - 1, d).getDay()]}, ${d} ${BULAN[m - 1]} ${y}`;
}
