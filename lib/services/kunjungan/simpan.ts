import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { jenisGambar } from "@/lib/services/absen-hp/aturan";

/** Foto kunjungan = data kerja karyawan & klien: DI LUAR public/, cuma tersaji lewat rute ber-login. */
export function folderFoto(): string {
  return process.env.KUNJUNGAN_DIR || path.join(process.cwd(), "storage", "kunjungan");
}

export const FOTO_MAKS_BITA = 6 * 1024 * 1024;

/** Simpan foto; nama berkas dirakit server (acak), tidak pernah dari kiriman. */
export async function simpanFoto(bita: Uint8Array): Promise<string> {
  const jenis = jenisGambar(bita);
  if (!jenis) throw new Error("bukan_gambar");
  const bulan = new Date().toISOString().slice(0, 7);
  const relatif = path.posix.join(bulan, `${randomUUID()}.${jenis}`);
  const tujuan = path.join(folderFoto(), relatif);
  await mkdir(path.dirname(tujuan), { recursive: true });
  await writeFile(tujuan, bita, { mode: 0o600 });
  return relatif;
}

function jalurAman(relatif: string): string | null {
  const akar = path.resolve(folderFoto());
  const penuh = path.resolve(akar, relatif);
  return penuh.startsWith(akar + path.sep) ? penuh : null;
}

/** Baca foto; jalurnya dari basis data, tapi tetap dikurung di folder foto. */
export async function bacaFoto(relatif: string): Promise<{ bita: Buffer; tipe: string } | null> {
  const penuh = jalurAman(relatif);
  if (!penuh) return null;
  try {
    const bita = await readFile(penuh);
    const jenis = jenisGambar(bita);
    if (!jenis) return null;
    return { bita, tipe: jenis === "jpg" ? "image/jpeg" : `image/${jenis}` };
  } catch {
    return null;
  }
}

/** Buang foto yang sudah tersimpan kalau baris kunjungannya gagal dibuat. */
export async function hapusFoto(relatif: string): Promise<void> {
  const penuh = jalurAman(relatif);
  if (penuh) await unlink(penuh).catch(() => {});
}
