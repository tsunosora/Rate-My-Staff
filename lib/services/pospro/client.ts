/**
 * Klien integrasi PosPro (kasir) — dipakai untuk menarik KPI kinerja karyawan.
 *
 * Endpoint di sisi PosPro: `/integrations/staff-list` & `/integrations/staff-kpi`,
 * dijaga header `x-api-key` (lihat backend/src/auth/api-key.guard.ts di repo PosPro).
 * Integrasi MATI bila POSPRO_API_URL / POSPRO_API_KEY belum diisi — semua fungsi
 * mengembalikan null, dan pemanggil harus tetap jalan tanpa data ini.
 */

export type PosproStaff = {
  userId: number;
  name: string;
  email: string;
  branchId: number | null;
  isActive: boolean;
};

export type PosproCsRating = {
  count: number;
  avgStars: number;
  satisfiedCount: number;
  satisfactionRate: number;
};

export type PosproTasks = {
  assigned: number;
  done: number;
  late: number;
  completionRate: number;
};

export type PosproSales = {
  transactions: number;
  grandTotal: number;
  averageTicket: number;
};

export type PosproStaffKpi = {
  userId: number;
  name: string;
  branchId: number | null;
  isActive: boolean;
  csRating: PosproCsRating;
  tasks: PosproTasks;
  sales: PosproSales;
};

export type PosproKpiResponse = {
  from: string;
  to: string;
  branchId: number | null;
  staff: PosproStaffKpi[];
  unmatchedCashierNames: string[];
};

/** Batas tunggu panggilan ke PosPro — jangan sampai portal karyawan ikut menggantung. */
const TIMEOUT_MS = 6000;

export function posproConfigured(): boolean {
  return Boolean(process.env.POSPRO_API_URL && process.env.POSPRO_API_KEY);
}

async function call<T>(path: string): Promise<T | null> {
  if (!posproConfigured()) return null;
  const base = process.env.POSPRO_API_URL!.replace(/\/+$/, "");

  try {
    const res = await fetch(`${base}${path}`, {
      headers: { "x-api-key": process.env.POSPRO_API_KEY! },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error(`[pospro] ${path} -> HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    // PosPro mati / jaringan putus bukan alasan untuk menggagalkan halaman pemanggil.
    console.error(`[pospro] ${path} gagal:`, e instanceof Error ? e.message : e);
    return null;
  }
}

/** Daftar akun PosPro untuk dropdown pemetaan karyawan. */
export function fetchPosproStaffList(): Promise<PosproStaff[] | null> {
  return call<PosproStaff[]>("/integrations/staff-list");
}

/** KPI seluruh staf pada satu rentang tanggal (YYYY-MM-DD). */
export function fetchPosproKpi(
  fromStr: string,
  toStr: string,
  branchId?: number | null
): Promise<PosproKpiResponse | null> {
  const qs = new URLSearchParams({ from: fromStr, to: toStr });
  if (branchId) qs.set("branchId", String(branchId));
  return call<PosproKpiResponse>(`/integrations/staff-kpi?${qs.toString()}`);
}

/** KPI satu karyawan berdasarkan pemetaan `posproUserId`; null bila tak ada/tak cocok. */
export async function fetchPosproKpiForUser(
  posproUserId: number | null,
  fromStr: string,
  toStr: string
): Promise<PosproStaffKpi | null> {
  if (!posproUserId) return null;
  const data = await fetchPosproKpi(fromStr, toStr);
  return data?.staff.find((s) => s.userId === posproUserId) ?? null;
}
