/**
 * Ringkasan lisensi untuk layar (setara `GET /saya/fitur` di POS). TIDAK PERNAH memuat kunci
 * mentah maupun token instalasi.
 */
import { keadaanLisensi } from "./layanan";
import { ringkasanPemakaian } from "./penjaga";

export async function ringkasanLisensi() {
  const k = await keadaanLisensi();
  return {
    ditegakkan: k.ditegakkan,
    status: k.status,
    hanyaBaca: k.hanyaBaca,
    alasan: k.alasan,
    jamMundur: k.jamMundur,
    produk: k.produk,
    paket: k.paket,
    klien: k.klien,
    namaKlien: k.namaKlien,
    fitur: k.fitur,
    batas: k.batas,
    berlakuSampai: k.berlakuSampai,
    tenggangSampai: k.tenggangSampai,
    sisaHari: k.sisaHari,
    sisaHariTenggang: k.sisaHariTenggang,
    terakhirTerlihat: k.simpanan.terakhirTerlihat,
    terakhirDicoba: k.simpanan.terakhirDicoba,
    catatanPenyegaran: k.simpanan.catatanTerakhir,
    tokenTerpasang: Boolean((process.env.QENDALI_LISENSI_TOKEN || "").trim()),
    pemakaian: await ringkasanPemakaian(),
  };
}

export type RingkasanLisensi = Awaited<ReturnType<typeof ringkasanLisensi>>;
