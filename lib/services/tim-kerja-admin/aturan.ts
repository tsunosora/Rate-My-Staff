/**
 * Aturan tim kerja yang KHUSUS halaman admin (Pengaturan → Tim Kerja): memilih kepala tim.
 * Anggota (tambah/pindah/keluarkan) memakai lib/services/tim-kerja — satu aturan untuk HP PIC
 * dan admin; admin memanggilnya dengan bolehPindah.
 */

export type PutusanPic = { ok: true } | { ok: false; pesan: string };

/**
 * Boleh karyawan ini jadi PIC tim tujuan? Satu orang cuma memimpin satu tim (kolom picId unik):
 * kalau dia sudah memimpin tim lain, admin harus melepasnya dari sana dulu — memindahkan diam-diam
 * membuat tim lama tiba-tiba tanpa PIC.
 */
export function bolehJadiPic(a: {
  timTujuanId: number;
  karyawan: { isActive: boolean; deletedAt: Date | null };
  memimpinTim: { id: number; nama: string } | null;
}): PutusanPic {
  if (a.karyawan.deletedAt) return { ok: false, pesan: "Karyawan ini sudah dihapus." };
  if (!a.karyawan.isActive) return { ok: false, pesan: "Karyawan ini nonaktif. Aktifkan dulu di Direktori." };
  if (a.memimpinTim && a.memimpinTim.id !== a.timTujuanId) {
    return { ok: false, pesan: `Karyawan ini sudah PIC tim "${a.memimpinTim.nama}". Lepas dulu dari sana.` };
  }
  return { ok: true };
}

/** Warna tim: #rrggbb. Selain itu jatuh ke warna bawaan. */
export function rapikanWarna(w: string | null | undefined, bawaan = "#6366f1"): string {
  return w && /^#[0-9a-fA-F]{6}$/.test(w) ? w.toLowerCase() : bawaan;
}
