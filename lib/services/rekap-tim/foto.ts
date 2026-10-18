import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { jenisGambar } from "@/lib/services/absen-hp/aturan";

/**
 * Foto rekap harian (opsional, satu per orang per hari) = data pribadi: DI LUAR public/, cuma
 * tersaji lewat rute ber-login. Pola yang sama dengan foto absen tim (lib/services/absen-tim/simpan).
 */
export function folderFotoRekap(): string {
  return process.env.REKAP_TIM_DIR || path.join(process.cwd(), "storage", "rekap-tim");
}

/** HP sudah mengecilkan foto ke ±1280 px JPEG; batas ini cuma penahan kiriman yang tidak wajar. */
export const FOTO_REKAP_MAKS_BITA = 6 * 1024 * 1024;

/** Simpan foto; nama berkas dirakit server (acak), tidak pernah dari kiriman. Bukan gambar → galat. */
export async function simpanFotoRekap(bita: Uint8Array): Promise<string> {
  const jenis = jenisGambar(bita);
  if (!jenis) throw new Error("bukan_gambar");
  const bulan = new Date().toISOString().slice(0, 7);
  const relatif = path.posix.join(bulan, `${randomUUID()}.${jenis}`);
  const tujuan = path.join(folderFotoRekap(), relatif);
  await mkdir(path.dirname(tujuan), { recursive: true });
  await writeFile(tujuan, bita, { mode: 0o600 });
  return relatif;
}

/** Baca foto; jalurnya dari basis data, tapi tetap dikurung di folder foto rekap. */
export async function bacaFotoRekap(relatif: string): Promise<{ bita: Buffer; tipe: string } | null> {
  const akar = path.resolve(folderFotoRekap());
  const penuh = path.resolve(akar, relatif);
  if (!penuh.startsWith(akar + path.sep)) return null;
  try {
    const bita = await readFile(penuh);
    const jenis = jenisGambar(bita);
    if (!jenis) return null;
    return { bita, tipe: jenis === "jpg" ? "image/jpeg" : `image/${jenis}` };
  } catch {
    return null;
  }
}
