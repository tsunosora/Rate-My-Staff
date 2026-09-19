/**
 * Tarif poin — bisa diubah owner di Pengaturan tanpa menyentuh kode.
 * Modul murni: tak menyentuh Prisma, supaya bisa diuji langsung.
 */

export type PointRates = {
  /** Poin per kelipatan omzet (default: 1 poin tiap Rp10.000 → Rp1jt = 100 poin). */
  omzetPerPoint: number;
  /** Poin per nota/closing yang dia tutup. */
  perTransaction: number;
  /**
   * Poin per **layout materi** — satu sales order yang disiapkan untuk cetak.
   * (Nama field mengikuti `designJobs` dari PosPro; istilah di toko "layout materi".)
   */
  perDesignJob: number;
  /**
   * Bobot kesulitan desain: nilai jasa desain per 1 poin tambahan.
   * Default Rp1.000 → Hard (Rp200rb) = 200 poin, Medium (Rp150rb) = 150,
   * Standar (Rp35rb) = 35, Easy A (Rp15rb) = 15.
   *
   * Sengaja besar: mendesain itu kerja terampil yang makan waktu, sedangkan
   * "layout materi" hanyalah menyiapkan order untuk cetak dan jumlahnya ratusan.
   * Dengan tarif lama (Rp5.000) kerja desain hanya 2–5% dari poin seorang desainer —
   * kalah telak oleh banyaknya layout.
   */
  designValuePerPoint: number;
  /** Poin per kartu produksi (dikali bobot bila dikerjakan berdua). */
  perOperatorJob: number;
  /** Poin per task/piket yang selesai tepat waktu. */
  perTaskOnTime: number;
  /** Poin per task/piket yang selesai tapi lewat tenggat. */
  perTaskLate: number;
  /** Poin per hari hadir tepat waktu (tidak telat). */
  perOnTimeDay: number;
};

/**
 * Default "seimbang antar peran": omzet besar tidak otomatis mengalahkan
 * operator & kedisiplinan. Rp1jt = 100 poin, sementara 5 task tepat waktu = 100 poin.
 */
export const DEFAULT_POINT_RATES: PointRates = {
  omzetPerPoint: 10000,
  perTransaction: 5,
  perDesignJob: 10,
  designValuePerPoint: 1000,
  perOperatorJob: 10,
  perTaskOnTime: 20,
  perTaskLate: 5,
  perOnTimeDay: 10,
};

/** Key di tabel Setting. */
export const POINT_SETTING_KEYS: Record<keyof PointRates, string> = {
  omzetPerPoint: "points_omzet_per_point",
  perTransaction: "points_per_transaction",
  perDesignJob: "points_per_design_job",
  designValuePerPoint: "points_design_value_per_point",
  perOperatorJob: "points_per_operator_job",
  perTaskOnTime: "points_per_task_ontime",
  perTaskLate: "points_per_task_late",
  perOnTimeDay: "points_per_ontime_day",
};

/** Apakah sistem poin dinyalakan? */
export const POINTS_ENABLED_KEY = "points_enabled";

type SettingsMap = Record<string, string | null>;

function num(settings: SettingsMap | undefined, key: string, fallback: number): number {
  const raw = settings?.[key];
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Baca tarif dari Setting; yang kosong memakai default. */
export function resolvePointRates(settings?: SettingsMap): PointRates {
  const out = { ...DEFAULT_POINT_RATES };
  for (const key of Object.keys(POINT_SETTING_KEYS) as (keyof PointRates)[]) {
    out[key] = num(settings, POINT_SETTING_KEYS[key], DEFAULT_POINT_RATES[key]);
  }
  // Pembagi tak boleh nol — akan membuat poin tak hingga.
  if (out.omzetPerPoint <= 0) out.omzetPerPoint = DEFAULT_POINT_RATES.omzetPerPoint;
  if (out.designValuePerPoint <= 0) out.designValuePerPoint = DEFAULT_POINT_RATES.designValuePerPoint;
  return out;
}

export function pointsEnabled(settings?: SettingsMap): boolean {
  return settings?.[POINTS_ENABLED_KEY] !== "false";
}
