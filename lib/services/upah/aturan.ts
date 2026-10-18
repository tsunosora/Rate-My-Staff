/**
 * Aturan kecil rekap persetujuan & periode upah — MURNI, diuji di tests/rekap-persetujuan.test.ts.
 */

export const RENTANG_MAKS_HARI = 31;

/** Date lokal → "YYYY-MM-DD". */
export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" → Date tengah malam LOKAL; selain itu null. */
export function dariYmd(s: string | null | undefined): Date | null {
  const m = String(s ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3]) ? d : null;
}

export function tambahHari(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** Jumlah hari kalender inklusif antara dua tanggal tengah malam. */
export function jumlahHari(dari: Date, sampai: Date): number {
  return Math.round((Date.UTC(sampai.getFullYear(), sampai.getMonth(), sampai.getDate()) -
    Date.UTC(dari.getFullYear(), dari.getMonth(), dari.getDate())) / 86_400_000) + 1;
}

/** Senin–Minggu yang memuat `hari`. */
export function mingguDari(hari: Date): { dari: Date; sampai: Date } {
  const h = new Date(hari.getFullYear(), hari.getMonth(), hari.getDate());
  const geser = (h.getDay() + 6) % 7; // Senin = 0
  const dari = tambahHari(h, -geser);
  return { dari, sampai: tambahHari(dari, 6) };
}

export type Rentang = { dari: Date; sampai: Date; dariYmd: string; sampaiYmd: string };

/**
 * Baca ?dari=&sampai=. Kosong = bawaan. Rentang terbalik atau lebih dari 31 hari ditolak dengan
 * pesan untuk pengguna — layar memuat semua baris rentang itu sekaligus.
 */
export function bacaRentang(
  dariS: string | null | undefined,
  sampaiS: string | null | undefined,
  bawaan: () => { dari: Date; sampai: Date },
): Rentang | { galat: string } {
  let dari = dariYmd(dariS);
  let sampai = dariYmd(sampaiS);
  if ((dariS && !dari) || (sampaiS && !sampai)) return { galat: "Tanggal tidak dikenal." };
  if (!dari && !sampai) ({ dari, sampai } = bawaan());
  else if (!dari) dari = sampai;
  else if (!sampai) sampai = dari;
  if (!dari || !sampai) return { galat: "Tanggal tidak dikenal." };
  if (sampai < dari) return { galat: "Tanggal akhir lebih awal dari tanggal awal." };
  if (jumlahHari(dari, sampai) > RENTANG_MAKS_HARI) return { galat: `Rentang paling panjang ${RENTANG_MAKS_HARI} hari.` };
  return { dari, sampai, dariYmd: ymd(dari), sampaiYmd: ymd(sampai) };
}

/** Batas query Prisma untuk kolom tanggal tengah malam: gte dari, lt sampai+1. */
export function batasQuery(r: Pick<Rentang, "dari" | "sampai">) {
  return { gte: r.dari, lt: tambahHari(r.sampai, 1) };
}

// ── Persetujuan ────────────────────────────────────────────────────────────────

export type Persetujuan = "menunggu" | "disetujui" | "ditolak";
export const PERSETUJUAN: readonly Persetujuan[] = ["menunggu", "disetujui", "ditolak"];
export const STATUS_REKAP = ["hadir", "setengah", "absen"] as const;

export type BarisKunci = { persetujuan: string; pembayaranId: number | null };

/** Baris yang sudah dibayar terkunci untuk siapa pun. */
export const terkunci = (b: Pick<BarisKunci, "pembayaranId">) => b.pembayaranId != null;

export type PutusanAksi = { ok: true } | { ok: false; pesan: string };

/** Boleh disetujui/ditolak dari keadaannya sekarang? Mengubah keputusan lama boleh, asal belum dibayar. */
export function bolehPutus(b: BarisKunci, aksi: "setujui" | "tolak"): PutusanAksi {
  if (terkunci(b)) return { ok: false, pesan: "Baris ini sudah dibayar, jadi tidak bisa diubah lagi." };
  if (aksi === "setujui" && b.persetujuan === "disetujui") return { ok: false, pesan: "Baris ini sudah disetujui." };
  if (aksi === "tolak" && b.persetujuan === "ditolak") return { ok: false, pesan: "Baris ini sudah ditolak." };
  return { ok: true };
}

/** Alasan tolak wajib, minimal 3 huruf setelah dirapikan. */
export function alasanTolakSah(s: string | null | undefined): string | null {
  const t = (s ?? "").trim().replace(/\s+/g, " ");
  return t.length >= 3 ? t.slice(0, 1000) : null;
}

/** Lembur jam: 0–24, dua desimal. */
export function rapikanLembur(n: unknown): number | null {
  const x = typeof n === "string" ? Number(n.replace(",", ".")) : Number(n);
  if (!Number.isFinite(x) || x < 0 || x > 24) return null;
  return Math.round(x * 100) / 100;
}

/** Teks bebas pendek (kota/divisi/catatan): dirapikan, kosong = null. */
export function teksAtauNull(s: string | null | undefined, maks: number): string | null {
  const t = (s ?? "").trim().replace(/\s+/g, " ");
  return t ? t.slice(0, maks) : null;
}

/** Rentang layar upah: bawaan minggu ini (Senin–Minggu). */
export function rentangUpah(dariS: string | null | undefined, sampaiS: string | null | undefined, hari: Date = new Date()) {
  return bacaRentang(dariS, sampaiS, () => mingguDari(hari));
}
