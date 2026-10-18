/**
 * Aturan timesheet (catatan pekerjaan per jam). MURNI — tanpa Prisma, tanpa jam sistem —
 * supaya bisa diuji langsung dan dipakai sama persis oleh portal karyawan & dasbor owner.
 *
 * Semua tanggal berbentuk "YYYY-MM-DD", semua jam "HH:MM" (24 jam). Satu entri selalu di
 * DALAM satu hari: selesai harus lebih besar dari mulai. Shift malam yang melewati tengah
 * malam dicatat dua entri (sebelum & sesudah 00:00) — lebih jujur daripada menebak tanggalnya.
 */

import { dayNumber, fromDayNumber } from "@/lib/services/leave/range";

/** Karyawan boleh mencatat/menyunting/menghapus entri sampai sekian hari ke belakang. */
export const BATAS_MUNDUR_HARI = 14;

/** Satu entri paling lama 16 jam — lebih dari itu hampir pasti salah ketik. */
export const MAKS_MENIT_ENTRI = 16 * 60;

/** Rentang rekap/daftar paling panjang (hari) — menahan kueri absensi tetap ringan. */
export const MAKS_RENTANG_HARI = 93;

const JAM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "HH:MM" -> menit sejak tengah malam; null bila bukan jam yang sah. Ketat: dua digit. */
export function jamKeMenit(jam: string | null | undefined): number | null {
  if (!jam) return null;
  const m = JAM_RE.exec(jam.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** 615 -> "10:15". */
export function menitKeJam(menit: number): string {
  const n = Math.max(0, Math.min(24 * 60 - 1, Math.round(menit)));
  return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
}

export type Hasil<T> = ({ ok: true } & T) | { ok: false; error: string };

/** Mulai–selesai di hari yang sama; kembalikan durasinya. */
export function periksaRentangJam(mulai: string, selesai: string): Hasil<{ menit: number }> {
  const a = jamKeMenit(mulai);
  const b = jamKeMenit(selesai);
  if (a === null) return { ok: false, error: "Jam mulai harus berformat HH:MM." };
  if (b === null) return { ok: false, error: "Jam selesai harus berformat HH:MM." };
  if (b <= a) {
    return {
      ok: false,
      error: "Jam selesai harus lebih besar dari jam mulai. Kerja lewat tengah malam dicatat dua entri.",
    };
  }
  if (b - a > MAKS_MENIT_ENTRI) return { ok: false, error: "Satu entri paling lama 16 jam." };
  return { ok: true, menit: b - a };
}

/**
 * Tanggal boleh dipakai karyawan: hari ini atau mundur maks. BATAS_MUNDUR_HARI, tidak boleh
 * tanggal depan (pekerjaan yang belum dikerjakan tidak dicatat).
 * `tanpaBatasMundur` untuk owner yang merapikan catatan lama.
 */
export function periksaTanggal(
  tanggal: string,
  hariIni: string,
  { tanpaBatasMundur = false }: { tanpaBatasMundur?: boolean } = {}
): Hasil<object> {
  if (!YMD_RE.test(tanggal)) return { ok: false, error: "Format tanggal harus YYYY-MM-DD." };
  const selisih = dayNumber(hariIni) - dayNumber(tanggal);
  if (selisih < 0) return { ok: false, error: "Tanggal tidak boleh di masa depan." };
  if (!tanpaBatasMundur && selisih > BATAS_MUNDUR_HARI) {
    return { ok: false, error: `Hanya bisa mencatat sampai ${BATAS_MUNDUR_HARI} hari ke belakang.` };
  }
  return { ok: true };
}

/** Entri lama masih boleh disunting/dihapus karyawan? (sama dengan batas mencatat). */
export function masihBisaDiubah(tanggal: string, hariIni: string): boolean {
  return periksaTanggal(tanggal, hariIni).ok;
}

export type RentangJam = { id?: number; mulai: string; selesai: string };

/**
 * Entri lain (di tanggal yang sama, milik karyawan yang sama) yang bertumpang-tindih.
 * Bersentuhan (09:00–10:00 lalu 10:00–11:00) BUKAN tumpang-tindih.
 */
export function cariTumpangTindih<T extends RentangJam>(
  baru: RentangJam,
  lain: T[],
  abaikanId?: number
): T | null {
  const a = jamKeMenit(baru.mulai);
  const b = jamKeMenit(baru.selesai);
  if (a === null || b === null) return null;
  for (const e of lain) {
    if (abaikanId !== undefined && e.id === abaikanId) continue;
    const c = jamKeMenit(e.mulai);
    const d = jamKeMenit(e.selesai);
    if (c === null || d === null) continue;
    if (a < d && c < b) return e;
  }
  return null;
}

/** Jam selesai paling akhir di antara entri satu hari (untuk tombol "lanjutkan"). */
export function selesaiTerakhir(entri: RentangJam[]): string | null {
  let terbaik: number | null = null;
  for (const e of entri) {
    const m = jamKeMenit(e.selesai);
    if (m !== null && (terbaik === null || m > terbaik)) terbaik = m;
  }
  return terbaik === null ? null : menitKeJam(terbaik);
}

/** Rapikan nama proyek: buang spasi berlebih. Kosong = tanpa proyek. */
export function rapikanProyek(proyek: string | null | undefined): string {
  return (proyek ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Saran proyek dari entri yang pernah ada: unik tanpa peduli huruf besar-kecil, ejaan yang
 * paling sering dipakai menang, urut dari yang paling sering lalu paling baru.
 */
export function saranProyek(
  entri: { proyek: string; tanggal: string }[],
  maks = 30
): string[] {
  const peta = new Map<string, { ejaan: Map<string, number>; jumlah: number; terakhir: string }>();
  for (const e of entri) {
    const p = rapikanProyek(e.proyek);
    if (!p) continue;
    const kunci = p.toLowerCase();
    const v = peta.get(kunci) ?? { ejaan: new Map(), jumlah: 0, terakhir: "" };
    v.jumlah += 1;
    v.ejaan.set(p, (v.ejaan.get(p) ?? 0) + 1);
    if (e.tanggal > v.terakhir) v.terakhir = e.tanggal;
    peta.set(kunci, v);
  }
  return [...peta.values()]
    .sort((x, y) => y.jumlah - x.jumlah || y.terakhir.localeCompare(x.terakhir))
    .slice(0, maks)
    .map((v) => [...v.ejaan.entries()].sort((a, b) => b[1] - a[1])[0][0]);
}

/** Senin dari minggu tempat `tanggal` berada. */
export function awalMinggu(tanggal: string): string {
  const n = dayNumber(tanggal);
  // 1970-01-01 = Kamis. (n + 3) % 7 = 0 untuk Senin.
  const hariKe = (((n + 3) % 7) + 7) % 7;
  return fromDayNumber(n - hariKe);
}

/** Semua tanggal dalam rentang (inklusif). */
export function daftarTanggal(dari: string, sampai: string): string[] {
  const out: string[] = [];
  for (let n = dayNumber(dari); n <= dayNumber(sampai); n++) out.push(fromDayNumber(n));
  return out;
}

/** Geser tanggal sejumlah hari (negatif = mundur). */
export function geserTanggal(tanggal: string, hari: number): string {
  return fromDayNumber(dayNumber(tanggal) + hari);
}

/**
 * Rentang dari query string, dirapikan: bawaan `bawaanDari`..`hariIni`, dibalik kalau
 * terbalik, dan dipotong ke MAKS_RENTANG_HARI.
 */
export function rapikanRentang(
  dari: string | null | undefined,
  sampai: string | null | undefined,
  bawaan: { dari: string; sampai: string }
): { dari: string; sampai: string } {
  let a = dari && YMD_RE.test(dari) ? dari : bawaan.dari;
  let b = sampai && YMD_RE.test(sampai) ? sampai : bawaan.sampai;
  if (a > b) [a, b] = [b, a];
  if (dayNumber(b) - dayNumber(a) + 1 > MAKS_RENTANG_HARI) a = geserTanggal(b, -(MAKS_RENTANG_HARI - 1));
  return { dari: a, sampai: b };
}

/**
 * Menit hadir menurut absensi. Lengkap (masuk & pulang) → selisihnya. Hari ini dan baru ada
 * scan masuk → dihitung sampai `menitSekarang` (supaya karyawan tahu sejauh ini berapa jam).
 * Selain itu 0 — jam hadir tidak boleh dikarang.
 */
export function menitHadir(
  jamMasuk: string | null | undefined,
  jamPulang: string | null | undefined,
  opsi: { hariIni?: boolean; menitSekarang?: number } = {}
): number {
  const a = jamKeMenit(jamMasuk ?? null);
  const b = jamKeMenit(jamPulang ?? null);
  if (a === null) return 0;
  if (b !== null) {
    const d = b >= a ? b - a : b + 24 * 60 - a;
    return d > MAKS_MENIT_ENTRI ? 0 : d;
  }
  if (opsi.hariIni && opsi.menitSekarang !== undefined && opsi.menitSekarang > a) {
    return Math.min(opsi.menitSekarang - a, MAKS_MENIT_ENTRI);
  }
  return 0;
}

/** Persen jam tercatat terhadap jam hadir; null bila tidak ada jam hadir (tidak bisa dibandingkan). */
export function persenTercatat(tercatat: number, hadir: number): number | null {
  if (hadir <= 0) return null;
  return Math.round((tercatat / hadir) * 100);
}

/** Jam hadir yang belum tercatat (tidak pernah negatif). */
export function sisaBelumTercatat(tercatat: number, hadir: number): number {
  return Math.max(0, hadir - tercatat);
}

// ── Rekap ─────────────────────────────────────────────────────────────────────

export type EntriRekap = { employeeId: number; tanggal: string; menit: number; proyek: string };
export type HadirRekap = { employeeId: number; tanggal: string; menit: number };

export type RekapAngka = { tercatat: number; hadir: number; persen: number | null };
export type RekapHari = RekapAngka & { tanggal: string };
export type RekapMinggu = RekapAngka & { awal: string };
export type RekapKaryawan = RekapAngka & {
  employeeId: number;
  jumlahEntri: number;
  hari: RekapHari[];
  minggu: RekapMinggu[];
};

function angka(tercatat: number, hadir: number): RekapAngka {
  return { tercatat, hadir, persen: persenTercatat(tercatat, hadir) };
}

/**
 * Rekap per karyawan: total, per hari, dan per minggu (Senin–Minggu), membandingkan jam
 * tercatat dengan jam hadir. Hari yang hanya punya salah satunya tetap muncul.
 */
export function rekapPerKaryawan(entri: EntriRekap[], hadir: HadirRekap[]): RekapKaryawan[] {
  type Kantong = { tercatat: Map<string, number>; hadir: Map<string, number>; jumlah: number };
  const per = new Map<number, Kantong>();
  const ambil = (id: number) => {
    let k = per.get(id);
    if (!k) per.set(id, (k = { tercatat: new Map(), hadir: new Map(), jumlah: 0 }));
    return k;
  };
  for (const e of entri) {
    const k = ambil(e.employeeId);
    k.tercatat.set(e.tanggal, (k.tercatat.get(e.tanggal) ?? 0) + e.menit);
    k.jumlah += 1;
  }
  for (const h of hadir) {
    if (h.menit <= 0) continue;
    const k = ambil(h.employeeId);
    k.hadir.set(h.tanggal, (k.hadir.get(h.tanggal) ?? 0) + h.menit);
  }

  const out: RekapKaryawan[] = [];
  for (const [employeeId, k] of per) {
    const tanggal = [...new Set([...k.tercatat.keys(), ...k.hadir.keys()])].sort();
    const hari: RekapHari[] = tanggal.map((t) => ({
      tanggal: t,
      ...angka(k.tercatat.get(t) ?? 0, k.hadir.get(t) ?? 0),
    }));
    const mingguMap = new Map<string, { t: number; h: number }>();
    for (const r of hari) {
      const w = awalMinggu(r.tanggal);
      const v = mingguMap.get(w) ?? { t: 0, h: 0 };
      v.t += r.tercatat;
      v.h += r.hadir;
      mingguMap.set(w, v);
    }
    const minggu = [...mingguMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([awal, v]) => ({ awal, ...angka(v.t, v.h) }));
    const total = hari.reduce((s, r) => ({ t: s.t + r.tercatat, h: s.h + r.hadir }), { t: 0, h: 0 });
    out.push({ employeeId, jumlahEntri: k.jumlah, hari, minggu, ...angka(total.t, total.h) });
  }
  return out;
}

export type RekapProyek = {
  /** Nama proyek; "" = entri tanpa proyek. */
  proyek: string;
  menit: number;
  jumlahEntri: number;
  karyawan: { employeeId: number; menit: number }[];
};

/** Rekap per proyek (tanpa peduli huruf besar-kecil), urut dari jam terbanyak. */
export function rekapPerProyek(entri: EntriRekap[]): RekapProyek[] {
  const per = new Map<string, { ejaan: Map<string, number>; menit: number; jumlah: number; orang: Map<number, number> }>();
  for (const e of entri) {
    const p = rapikanProyek(e.proyek);
    const kunci = p.toLowerCase();
    const v = per.get(kunci) ?? { ejaan: new Map(), menit: 0, jumlah: 0, orang: new Map() };
    v.menit += e.menit;
    v.jumlah += 1;
    v.ejaan.set(p, (v.ejaan.get(p) ?? 0) + 1);
    v.orang.set(e.employeeId, (v.orang.get(e.employeeId) ?? 0) + e.menit);
    per.set(kunci, v);
  }
  return [...per.values()]
    .map((v) => ({
      proyek: [...v.ejaan.entries()].sort((a, b) => b[1] - a[1])[0][0],
      menit: v.menit,
      jumlahEntri: v.jumlah,
      karyawan: [...v.orang.entries()]
        .map(([employeeId, menit]) => ({ employeeId, menit }))
        .sort((a, b) => b.menit - a.menit),
    }))
    .sort((a, b) => b.menit - a.menit || a.proyek.localeCompare(b.proyek));
}
