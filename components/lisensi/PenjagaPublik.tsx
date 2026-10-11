/**
 * Penjaga halaman PUBLIK (rating tamu, portal karyawan, form izin) — dirender di server.
 *
 * Kalimatnya sengaja netral dan TIDAK menyebut paket: yang membukanya tamu atau karyawan, bukan
 * pemilik, dan nama paket di halaman publik membocorkan tingkat langganan klien. API di
 * belakangnya juga ditolak sendiri oleh route(), jadi ini cuma supaya layarnya terbaca jelas.
 */
import { keadaanLisensi } from "@/lib/lisensi/layanan";
import { bolehFitur } from "@/lib/lisensi/keadaan-lisensi";
import { ATURAN_HALAMAN, fiturUntuk } from "@/lib/lisensi/aturan-jalur";

/** `jalur` = awalan halamannya (mis. "/rate"); kode fiturnya dibaca dari ATURAN_HALAMAN, satu sumber. */
export async function PenjagaPublik({ jalur, children }: { jalur: string; children: React.ReactNode }) {
  const fitur = fiturUntuk(jalur, ATURAN_HALAMAN);
  const k = fitur ? await keadaanLisensi().catch(() => null) : null;
  if (!fitur || !k || bolehFitur(k, fitur)) return <>{children}</>;
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="font-display text-xl font-bold text-fg">Halaman ini sedang tidak tersedia</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Fitur ini belum diaktifkan oleh pengelola. Silakan hubungi pihak yang membagikan tautan ini.
      </p>
    </div>
  );
}
