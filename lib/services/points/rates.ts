/**
 * Tarif poin — bisa diubah owner di Pengaturan tanpa menyentuh kode.
 * Modul murni: tak menyentuh Prisma, supaya bisa diuji langsung.
 */

export type PointRates = {
  /** Poin per kelipatan omzet (default: 1 poin tiap Rp10.000 → Rp1jt = 100 poin). */
  omzetPerPoint: number;
  /** Poin per nota/closing yang dia tutup. */
  perTransaction: number;
  /** Poin per order desain. */
  perDesignJob: number;
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
  // Pembagi omzet tak boleh nol — akan membuat poin tak hingga.
  if (out.omzetPerPoint <= 0) out.omzetPerPoint = DEFAULT_POINT_RATES.omzetPerPoint;
  return out;
}

export function pointsEnabled(settings?: SettingsMap): boolean {
  return settings?.[POINTS_ENABLED_KEY] !== "false";
}
