/**
 * Aturan jadwal shift per tanggal (roster). Modul MURNI (tanpa Prisma) supaya bisa diuji langsung.
 *
 * Satu baris `JadwalShift` per (karyawan, tanggal) MENGALAHKAN jadwal tetap karyawan
 * (`Employee.workScheduleId`) untuk hari itu. `libur=true` = hari libur karyawan itu: dihitung
 * persis seperti hari libur nasional (status "holiday" bila tidak masuk; bila masuk, baris laporan
 * ditandai hari libur — lembur hari libur di struk ikut aturan yang sama dengan tanggal merah).
 *
 * Tanpa satu baris pun, semua hasil HARUS identik dengan sebelum fitur ini ada — dijaga
 * tests/jadwal-shift.test.ts.
 */
import type { ScheduleInfo } from "@/lib/services/attendance/report";
import { dayNumber, fromDayNumber, expandDates } from "@/lib/services/leave/range";

/** Rentang terpanjang satu permintaan baca/salin (cukup untuk tampilan bulan + sedikit). */
export const MAKS_HARI_RENTANG = 62;
/** Sel terbanyak dalam satu simpan (mis. 60 karyawan × 31 hari ≈ 1.860). */
export const MAKS_SEL_SIMPAN = 2000;

export type WorkScheduleLike = {
  id: number;
  startTime: string | null;
  endTime: string | null;
  lateToleranceMinutes: number;
  isHoliday: boolean;
  flexibleHours: boolean;
};

/** Baris WorkSchedule → ScheduleInfo yang dipakai computeAttendanceRow. */
export function infoJadwal(ws: WorkScheduleLike | null | undefined): ScheduleInfo | null {
  if (!ws) return null;
  return {
    startTime: ws.startTime,
    endTime: ws.endTime,
    lateToleranceMinutes: ws.lateToleranceMinutes,
    isHoliday: ws.isHoliday,
    flexibleHours: ws.flexibleHours,
  };
}

export type BarisRoster = {
  employeeId: number;
  tanggal: string; // YYYY-MM-DD
  workScheduleId: number | null;
  libur: boolean;
  catatan?: string | null;
  /** Jadwal dari relasi; null bila baris cuma "libur" atau jadwalnya sudah dihapus permanen. */
  workSchedule?: WorkScheduleLike | null;
};

export type JadwalHari = {
  schedule: ScheduleInfo | null;
  /** Id jadwal kerja yang berlaku hari itu (null = tanpa jadwal). */
  workScheduleId: number | null;
  /** Hari libur KHUSUS karyawan ini (dari roster). Libur nasional/Minggu TIDAK di sini. */
  libur: boolean;
  /** "roster" = dari JadwalShift, "bawaan" = jadwal tetap karyawan. */
  sumber: "roster" | "bawaan";
  catatan: string | null;
};

export type Bawaan = { id: number | null; schedule: ScheduleInfo | null };

/**
 * Jadwal satu hari dari jadwal tetap + baris roster (bila ada).
 * Baris tanpa jadwal DAN tanpa libur tidak bermakna (seharusnya sudah dihapus) → bawaan.
 * Baris libur yang juga menyebut jadwal: jadwalnya tetap dipakai untuk menghitung bila
 * karyawan ternyata masuk; tanpa jadwal → jadwal tetapnya.
 */
export function jadwalHari(bawaan: Bawaan, roster: BarisRoster | null | undefined): JadwalHari {
  const dariBawaan: JadwalHari = {
    schedule: bawaan.schedule,
    workScheduleId: bawaan.id,
    libur: false,
    sumber: "bawaan",
    catatan: null,
  };
  if (!roster) return dariBawaan;
  const punyaJadwal = roster.workScheduleId != null && roster.workSchedule != null;
  if (!punyaJadwal && !roster.libur) return dariBawaan;
  return {
    schedule: punyaJadwal ? infoJadwal(roster.workSchedule) : bawaan.schedule,
    workScheduleId: punyaJadwal ? roster.workScheduleId : bawaan.id,
    libur: roster.libur,
    sumber: "roster",
    catatan: roster.catatan ?? null,
  };
}

export const kunciSel = (employeeId: number, ymd: string) => `${employeeId}|${ymd}`;

export type PetaJadwal = {
  /** Jadwal efektif karyawan pada tanggal itu. Karyawan tak dikenal → tanpa jadwal. */
  get(employeeId: number, ymd: string): JadwalHari;
  /** Jumlah baris roster yang ikut dimuat (0 = semua hasil sama dengan jadwal tetap). */
  jumlahRoster: number;
};

/** Gabung jadwal tetap per karyawan + baris roster jadi peta yang bisa ditanya per hari. */
export function buatPetaJadwal(
  bawaanPerKaryawan: Map<number, Bawaan>,
  roster: BarisRoster[]
): PetaJadwal {
  const peta = new Map<string, BarisRoster>();
  for (const r of roster) peta.set(kunciSel(r.employeeId, r.tanggal), r);
  return {
    jumlahRoster: peta.size,
    get(employeeId, ymd) {
      const bawaan = bawaanPerKaryawan.get(employeeId) ?? { id: null, schedule: null };
      return jadwalHari(bawaan, peta.get(kunciSel(employeeId, ymd)));
    },
  };
}

/** Tanggal libur umum (Holiday + Minggu otomatis) — rumus sama dgn laporan absensi. */
export function liburUmum(ymd: string, liburNasional: Set<string>, mingguOtomatis: boolean): boolean {
  if (liburNasional.has(ymd)) return true;
  return mingguOtomatis && new Date(`${ymd}T00:00:00`).getDay() === 0;
}

// ─────────────────────────── Simpan / isi massal / salin ───────────────────────────

export type SelSimpan = {
  employeeId: number;
  tanggal: string;
  workScheduleId: number | null;
  libur: boolean;
  catatan?: string | null;
};

export type RencanaSimpan = {
  /** Baris yang di-upsert. */
  simpan: SelSimpan[];
  /** Sel yang dikembalikan ke jadwal tetap (barisnya dihapus). */
  hapus: { employeeId: number; tanggal: string }[];
};

/** `workScheduleId:null & libur:false` = hapus barisnya. Sel ganda: yang terakhir menang. */
export function pisahSimpan(sel: SelSimpan[]): RencanaSimpan {
  const akhir = new Map<string, SelSimpan>();
  for (const s of sel) akhir.set(kunciSel(s.employeeId, s.tanggal), s);
  const simpan: SelSimpan[] = [];
  const hapus: { employeeId: number; tanggal: string }[] = [];
  for (const s of akhir.values()) {
    if (s.workScheduleId == null && !s.libur) hapus.push({ employeeId: s.employeeId, tanggal: s.tanggal });
    else simpan.push({ ...s, catatan: s.catatan?.trim() ? s.catatan.trim() : null });
  }
  return { simpan, hapus };
}

export type LangkahPola = { workScheduleId: number | null; libur: boolean };

/**
 * Isi massal: tiap karyawan × tiap tanggal dalam rentang mendapat satu langkah pola.
 * Pola berputar per HARI KALENDER sejak `dari` (mis. [pagi, pagi, siang, siang, libur]),
 * sehingga tiap karyawan mendapat urutan yang sama. `hari` (0=Minggu…6=Sabtu) membatasi
 * hari yang diisi — hari lain dilewati tanpa mengubah urutan pola.
 * Langkah `{workScheduleId:null, libur:false}` = kembalikan ke bawaan.
 */
export function rencanaIsiMassal(opts: {
  employeeIds: number[];
  dari: string;
  sampai: string;
  pola: LangkahPola[];
  hari?: number[] | null;
}): SelSimpan[] {
  if (opts.pola.length === 0) return [];
  const tanggal = expandDates(opts.dari, opts.sampai);
  const saring = opts.hari && opts.hari.length > 0 ? new Set(opts.hari) : null;
  const out: SelSimpan[] = [];
  const ids = [...new Set(opts.employeeIds)];
  tanggal.forEach((ymd, i) => {
    if (saring && !saring.has(new Date(`${ymd}T00:00:00`).getDay())) return;
    const langkah = opts.pola[i % opts.pola.length];
    for (const employeeId of ids) {
      out.push({ employeeId, tanggal: ymd, workScheduleId: langkah.workScheduleId, libur: langkah.libur });
    }
  });
  return out;
}

/**
 * Salin roster satu rentang (mis. minggu lalu) ke rentang lain sepanjang sama.
 * `timpa`: sel tujuan yang tidak punya padanan di sumber dikembalikan ke bawaan, supaya
 * hasilnya persis salinan. Tanpa `timpa`, sel tujuan yang sudah berisi roster dibiarkan.
 */
export function rencanaSalin(opts: {
  employeeIds: number[];
  dariSumber: string;
  dariTujuan: string;
  jumlahHari: number;
  sumber: SelSimpan[];
  tujuanAda: { employeeId: number; tanggal: string }[];
  timpa: boolean;
}): SelSimpan[] {
  const geser = dayNumber(opts.dariTujuan) - dayNumber(opts.dariSumber);
  const awalSumber = dayNumber(opts.dariSumber);
  const akhirSumber = awalSumber + opts.jumlahHari - 1;
  const ids = new Set(opts.employeeIds);
  const ada = new Set(opts.tujuanAda.map((t) => kunciSel(t.employeeId, t.tanggal)));

  const hasil = new Map<string, SelSimpan>();
  for (const s of opts.sumber) {
    const n = dayNumber(s.tanggal);
    if (!ids.has(s.employeeId) || n < awalSumber || n > akhirSumber) continue;
    const tanggal = fromDayNumber(n + geser);
    const k = kunciSel(s.employeeId, tanggal);
    if (!opts.timpa && ada.has(k)) continue;
    hasil.set(k, { employeeId: s.employeeId, tanggal, workScheduleId: s.workScheduleId, libur: s.libur, catatan: s.catatan ?? null });
  }
  if (opts.timpa) {
    for (const t of opts.tujuanAda) {
      const k = kunciSel(t.employeeId, t.tanggal);
      if (!ids.has(t.employeeId) || hasil.has(k)) continue;
      hasil.set(k, { employeeId: t.employeeId, tanggal: t.tanggal, workScheduleId: null, libur: false });
    }
  }
  return [...hasil.values()];
}

/** Senin dari minggu yang memuat `ymd`. */
export function seninDari(ymd: string): string {
  const hari = new Date(`${ymd}T00:00:00`).getDay(); // 0=Minggu
  const mundur = hari === 0 ? 6 : hari - 1;
  return fromDayNumber(dayNumber(ymd) - mundur);
}

export function tambahHari(ymd: string, n: number): string {
  return fromDayNumber(dayNumber(ymd) + n);
}

/** Validasi rentang baca/salin: format, urutan, panjang. */
export function cekRentang(dari: string, sampai: string): { ok: true; hari: number } | { ok: false; error: string } {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(dari) || !re.test(sampai)) return { ok: false, error: "Format tanggal harus YYYY-MM-DD" };
  const hari = dayNumber(sampai) - dayNumber(dari) + 1;
  if (hari < 1) return { ok: false, error: "Tanggal akhir sebelum tanggal awal" };
  if (hari > MAKS_HARI_RENTANG) return { ok: false, error: `Rentang maksimal ${MAKS_HARI_RENTANG} hari` };
  return { ok: true, hari };
}

/** Tanggal paling awal dari sekumpulan sel (untuk hitung ulang status sejak tanggal itu). */
export function tanggalTerawal(sel: { tanggal: string }[]): string | null {
  let min: string | null = null;
  for (const s of sel) if (min === null || s.tanggal < min) min = s.tanggal;
  return min;
}
