import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toYmd } from "@/lib/services/leave/service";
import { cekJumlah, cekTanggal, LABEL_KATEGORI, type Kategori } from "./aturan";
import { FOTO_MAKS_BITA, simpanFoto } from "./simpan";

type Baris = {
  id: number;
  employeeId: number;
  tanggal: Date;
  kategori: string;
  jumlah: Prisma.Decimal;
  keterangan: string;
  fotoPath: string | null;
  status: string;
  jumlahDisetujui: Prisma.Decimal | null;
  sumber: string;
  decidedAt: Date | null;
  catatanKeputusan: string | null;
  dibayarAt: Date | null;
  createdAt: Date;
};

/** Bentuk satu klaim untuk klien. Decimal -> number (cukup untuk Rupiah ≤ 50 juta). */
export function serialisasi(r: Baris) {
  return {
    id: r.id,
    employeeId: r.employeeId,
    tanggal: toYmd(r.tanggal),
    kategori: r.kategori,
    kategoriLabel: LABEL_KATEGORI[r.kategori as Kategori] ?? r.kategori,
    jumlah: Number(r.jumlah),
    jumlahDisetujui: r.jumlahDisetujui === null ? null : Number(r.jumlahDisetujui),
    keterangan: r.keterangan,
    adaFoto: Boolean(r.fotoPath),
    status: r.status,
    sumber: r.sumber,
    catatanKeputusan: r.catatanKeputusan,
    decidedAt: r.decidedAt,
    dibayarAt: r.dibayarAt,
    createdAt: r.createdAt,
  };
}

export type KlaimMasuk = { tanggal: string; kategori: Kategori; jumlah: number; keterangan: string };

/** Periksa aturan tanggal & jumlah; mengembalikan pesan galat per medan atau null. */
export function periksaKlaim(k: KlaimMasuk): Record<string, string[]> | null {
  const tgl = cekTanggal(k.tanggal, toYmd(new Date()));
  if (!tgl.ok) return { tanggal: [tgl.error] };
  const jml = cekJumlah(k.jumlah);
  if (!jml.ok) return { jumlah: [jml.error] };
  return null;
}

/**
 * Ambil & simpan foto dari multipart. `wajib` = tanpa foto ditolak.
 * Mengembalikan jalur relatif, null (tidak ada foto & tidak wajib), atau pesan galat.
 */
export async function fotoDariForm(
  form: FormData,
  wajib: boolean
): Promise<{ ok: true; path: string | null } | { ok: false; error: string }> {
  const foto = form.get("foto");
  if (!(foto instanceof File) || foto.size === 0) {
    return wajib ? { ok: false, error: "Foto nota wajib dilampirkan." } : { ok: true, path: null };
  }
  if (foto.size > FOTO_MAKS_BITA) return { ok: false, error: "Foto terlalu besar (maks. 6 MB)." };
  try {
    return { ok: true, path: await simpanFoto(new Uint8Array(await foto.arrayBuffer())) };
  } catch {
    return { ok: false, error: "Berkas foto tidak dikenali. Kirim foto JPG, PNG, atau WebP." };
  }
}

/** Medan teks multipart -> objek biasa untuk zod. */
export function medanForm(form: FormData, kunci: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of kunci) {
    const v = form.get(k);
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

export async function idPengguna(email: string | null | undefined): Promise<number | null> {
  if (!email) return null;
  const u = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return u?.id ?? null;
}
