import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { jenisGambar } from "@/lib/services/absen-hp/aturan";

/** Foto nota = data pribadi karyawan: DI LUAR public/, cuma tersaji lewat rute ber-login/ber-PIN. */
export function folderFoto(): string {
  return process.env.REIMBURSEMENT_DIR || path.join(process.cwd(), "storage", "reimbursement");
}

export const FOTO_MAKS_BITA = 6 * 1024 * 1024;

/** Simpan foto nota; isinya diperiksa (bukan dari tipe kiriman), nama berkas dirakit server (acak). */
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

/** Jalur penuh — tetap dikurung di folder foto walau jalurnya datang dari basis data. */
function jalurAman(relatif: string): string | null {
  const akar = path.resolve(folderFoto());
  const penuh = path.resolve(akar, relatif);
  return penuh.startsWith(akar + path.sep) ? penuh : null;
}

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

/** Hapus foto (klaim dibatalkan). Gagal menghapus tidak menggagalkan pembatalannya. */
export async function hapusFoto(relatif: string | null | undefined): Promise<void> {
  if (!relatif) return;
  const penuh = jalurAman(relatif);
  if (!penuh) return;
  await unlink(penuh).catch(() => undefined);
}

/** Respons gambar untuk rute foto; tidak pernah di-cache publik. */
export function responsFoto(f: { bita: Buffer; tipe: string }): Response {
  return new Response(new Uint8Array(f.bita), {
    headers: {
      "Content-Type": f.tipe,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
