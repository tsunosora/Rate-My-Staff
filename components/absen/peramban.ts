/**
 * Pembantu PERAMBAN untuk halaman absen HP (/absen/[token]) — dipakai absen HP biasa dan layar
 * "Absen tim" PIC. Tidak boleh mengimpor lib/services/absen-hp/aturan (berkas itu memakai
 * node:crypto, tidak bisa dimuat di peramban).
 */

const KUNCI_PERANGKAT = "qe-absen-hp-perangkat";

/** Id acak HP ini; server cuma menyimpan sidiknya. Hilang kalau data peramban dihapus. */
export function idPerangkat(): string {
  try {
    let id = localStorage.getItem(KUNCI_PERANGKAT);
    if (!id) {
      id = crypto.randomUUID() + crypto.randomUUID().slice(0, 8);
      localStorage.setItem(KUNCI_PERANGKAT, id);
    }
    return id;
  } catch {
    return "";
  }
}

/** Foto dikecilkan di HP (sisi terpanjang 1280 px, JPEG) supaya cepat terkirim di sinyal lemah. */
export async function kecilkan(berkas: File): Promise<Blob> {
  const bmp = await createImageBitmap(berkas);
  const skala = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * skala);
  c.height = Math.round(bmp.height * skala);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((ok, gagal) => c.toBlob((b) => (b ? ok(b) : gagal(new Error("foto"))), "image/jpeg", 0.8));
}

export function bacaLokasi(): Promise<GeolocationPosition> {
  return new Promise((ok, gagal) =>
    navigator.geolocation.getCurrentPosition(ok, gagal, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }),
  );
}

export const jamDari = (t: string) => new Date(t).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

/** Sama dengan teksJarak() di lib/services/absen-hp/aturan.ts. */
export const teksJarak = (m: number) =>
  m < 1000 ? `${m} m` : `${(m / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} km`;
