/**
 * Periode struk absensi: bulanan (bulan penuh) atau mingguan (Senin–Minggu).
 * Modul murni: dipakai route API & receipt-source untuk menyeragamkan rentang + label.
 */

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

export type ReceiptPeriodMode = "month" | "week" | "custom";

export type ReceiptPeriod = {
  mode: ReceiptPeriodMode;
  /** Tahun acuan (nama file/kunci) — untuk week diambil dari tanggal awal minggu. */
  year: number;
  /** Bulan acuan 1-12 (nama file/kunci) — untuk week diambil dari tanggal awal minggu. */
  month: number;
  startStr: string; // YYYY-MM-DD (inklusif)
  endStr: string; // YYYY-MM-DD (inklusif)
  /** Label tampil, mis. "April 2026" atau "07–13 Apr 2026". */
  label: string;
};

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseYmd(s: string): { y: number; m: number; d: number } {
  const [y, m, d] = s.split("-").map(Number);
  return { y, m, d };
}

/** Rentang bulan penuh (tanggal 1 s/d hari terakhir). */
export function monthPeriod(year: number, month: number): ReceiptPeriod {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0); // hari terakhir bulan
  return {
    mode: "month",
    year,
    month,
    startStr: ymd(start),
    endStr: ymd(end),
    label: `${MONTHS[month - 1]} ${year}`,
  };
}

/** Minggu Senin–Minggu yang memuat `dateStr`. */
export function weekRange(dateStr: string): { startStr: string; endStr: string } {
  const { y, m, d } = parseYmd(dateStr);
  const base = new Date(y, m - 1, d);
  const dow = base.getDay(); // 0=Minggu .. 6=Sabtu
  const offsetToMonday = (dow + 6) % 7; // Senin=0, Selasa=1, ... Minggu=6
  const start = new Date(y, m - 1, d - offsetToMonday);
  const end = new Date(y, m - 1, d - offsetToMonday + 6);
  return { startStr: ymd(start), endStr: ymd(end) };
}

/** Label rentang minggu, mis. "07–13 Apr 2026" atau lintas bulan "28 Apr – 04 Mei 2026". */
export function weekLabel(startStr: string, endStr: string): string {
  const s = parseYmd(startStr);
  const e = parseYmd(endStr);
  const dd = (n: number) => String(n).padStart(2, "0");
  if (s.y === e.y && s.m === e.m) {
    return `${dd(s.d)}–${dd(e.d)} ${MONTHS_SHORT[s.m - 1]} ${s.y}`;
  }
  const left = `${dd(s.d)} ${MONTHS_SHORT[s.m - 1]}${s.y !== e.y ? ` ${s.y}` : ""}`;
  const right = `${dd(e.d)} ${MONTHS_SHORT[e.m - 1]} ${e.y}`;
  return `${left} – ${right}`;
}

/** Minggu (Senin–Minggu) yang memuat `dateStr`; year/month diambil dari tanggal awal minggu. */
export function weekPeriod(dateStr: string): ReceiptPeriod {
  const { startStr, endStr } = weekRange(dateStr);
  const s = parseYmd(startStr);
  return { mode: "week", year: s.y, month: s.m, startStr, endStr, label: weekLabel(startStr, endStr) };
}

/** Rentang bebas (custom) dari tanggal awal s/d akhir (inklusif); dibalik bila terbalik. */
export function customPeriod(startStr: string, endStr: string): ReceiptPeriod {
  // Format YYYY-MM-DD urut secara leksikografis = kronologis, jadi bisa dibandingkan langsung.
  const [s, e] = endStr < startStr ? [endStr, startStr] : [startStr, endStr];
  const sy = parseYmd(s);
  return { mode: "custom", year: sy.y, month: sy.m, startStr: s, endStr: e, label: weekLabel(s, e) };
}

/** Potongan nama file untuk periode (bulan: "2026-4"; minggu/custom: "2026-04-06_2026-04-12"). */
export function periodFileTag(p: ReceiptPeriod): string {
  return p.mode === "month" ? `${p.year}-${p.month}` : `${p.startStr}_${p.endStr}`;
}

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Baca periode dari query string; fallback aman ke bulan berjalan (`now`). */
export function resolveReceiptPeriod(sp: URLSearchParams, now: Date = new Date()): ReceiptPeriod {
  if (sp.get("period") === "week") {
    const wk = sp.get("week");
    const dateStr = wk && YMD_RE.test(wk) ? wk : ymd(now);
    return weekPeriod(dateStr);
  }
  if (sp.get("period") === "custom") {
    const start = sp.get("start");
    const end = sp.get("end");
    if (start && YMD_RE.test(start) && end && YMD_RE.test(end)) return customPeriod(start, end);
    // start/end tak valid -> fallback aman ke bulan berjalan (jatuh ke bawah).
  }
  const year = Number(sp.get("year")) || now.getFullYear();
  const monthRaw = Number(sp.get("month")) || now.getMonth() + 1;
  const month = monthRaw >= 1 && monthRaw <= 12 ? monthRaw : now.getMonth() + 1;
  return monthPeriod(year, month);
}
