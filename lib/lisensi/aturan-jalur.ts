/**
 * Peta JALUR → kode fitur lisensi, untuk API dan halaman. MURNI, supaya bisa diuji.
 *
 * SATU peta untuk penegak di server (`lib/http.ts` → `route()`) dan untuk penjaga halaman +
 * sidebar. Dua peta untuk hal yang sama pasti menyimpang suatu hari — pelajaran yang sudah
 * dibayar di POS (`aturan-menu.ts`).
 *
 * Dicocokkan per AWALAN, dan yang TERPANJANG menang: `/api/employees/1/portal-pin` milik
 * hr.portal, bukan hr.employees. Segmen dinamis ditulis `*`.
 *
 * Yang TIDAK ada di peta = terbuka untuk semua paket (dasbor, pengaturan umum, akun, notifikasi).
 * Itu bawaan yang benar: penegakan yang kelewat lebar menutup layar yang dibayar klien.
 *
 * Kode fiturnya HARUS ada di `data/paket.json` repo qendali (produk `qendali_employee`).
 * Salah ketik di sini menutup jalurnya untuk SEMUA klien tanpa satu pun log — jadi ada tesnya.
 */

export type Aturan = { awalan: string; fitur: string };

export const ATURAN_API: readonly Aturan[] = [
  { awalan: "/api/employees/*/portal-pin", fitur: "hr.portal" },
  { awalan: "/api/employees", fitur: "hr.employees" },
  { awalan: "/api/departments", fitur: "hr.employees" },
  { awalan: "/api/positions", fitur: "hr.employees" },

  { awalan: "/api/attendance/leave-link", fitur: "hr.leave" },
  { awalan: "/api/attendance/receipt", fitur: "hr.overtime" },
  { awalan: "/api/attendance/report", fitur: "hr.reports" },
  { awalan: "/api/attendance", fitur: "hr.attendance" },
  { awalan: "/api/machines", fitur: "hr.attendance" },
  { awalan: "/api/fingerspot/logs", fitur: "hr.attendance" },

  { awalan: "/api/work-schedules", fitur: "hr.schedule" },
  { awalan: "/api/holidays", fitur: "hr.schedule" },
  { awalan: "/api/overtime-categories", fitur: "hr.overtime" },

  { awalan: "/api/leave-requests", fitur: "hr.leave" },
  { awalan: "/api/public/absence-form", fitur: "hr.leave" },

  { awalan: "/api/assessment-templates", fitur: "hr.assessment" },
  { awalan: "/api/assessment-indicators", fitur: "hr.assessment" },
  { awalan: "/api/assessments", fitur: "hr.assessment" },
  // /api/reports itu laporan PENILAIAN (prisma.assessment), bukan laporan absensi.
  { awalan: "/api/reports/employee/*/public-feedbacks", fitur: "hr.guest_rating" },
  { awalan: "/api/reports", fitur: "hr.assessment" },

  { awalan: "/api/public/employee", fitur: "hr.guest_rating" },
  { awalan: "/api/public/portal", fitur: "hr.portal" },

  { awalan: "/api/points", fitur: "hr.points" },
  { awalan: "/api/rewards", fitur: "hr.points" },
  { awalan: "/api/redemptions", fitur: "hr.points" },

  { awalan: "/api/integrations", fitur: "hr.pos_link" },
  { awalan: "/api/pospro", fitur: "hr.pos_link" },
];

export const ATURAN_HALAMAN: readonly Aturan[] = [
  { awalan: "/employees", fitur: "hr.employees" },
  { awalan: "/attendance/receipt", fitur: "hr.overtime" },
  { awalan: "/attendance/report", fitur: "hr.reports" },
  { awalan: "/attendance", fitur: "hr.attendance" },
  { awalan: "/leave-requests", fitur: "hr.leave" },
  { awalan: "/points", fitur: "hr.points" },
  { awalan: "/assessments", fitur: "hr.assessment" },
  { awalan: "/reports", fitur: "hr.assessment" },
  { awalan: "/settings/work-schedules", fitur: "hr.schedule" },
  { awalan: "/rate", fitur: "hr.guest_rating" },
  { awalan: "/me", fitur: "hr.portal" },
  { awalan: "/absence", fitur: "hr.leave" },
];

function cocok(jalur: string, awalan: string): boolean {
  const a = awalan.split("/");
  const j = jalur.split("/");
  if (j.length < a.length) return false;
  return a.every((seg, i) => seg === "*" || seg === j[i]);
}

/** Kode fitur yang dibutuhkan sebuah jalur, atau null kalau jalurnya terbuka untuk semua. */
export function fiturUntuk(jalur: string, aturan: readonly Aturan[]): string | null {
  const bersih = (jalur.split("?")[0] || "/").replace(/\/+$/, "") || "/";
  let terbaik: Aturan | null = null;
  for (const a of aturan) {
    if (!cocok(bersih, a.awalan)) continue;
    if (!terbaik || a.awalan.split("/").length > terbaik.awalan.split("/").length) terbaik = a;
  }
  return terbaik?.fitur ?? null;
}

/** Metode yang tidak pernah diblokir mode hanya-baca. */
export const METODE_BACA = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Jalur yang TETAP boleh menulis saat lisensi habis masa (hanya-baca). Tiap baris punya alasan:
 * - auth & ganti sandi: tanpa ini orangnya bahkan tidak bisa masuk untuk melihat datanya.
 * - lisensi: SATU-SATUNYA jalan keluar — menyegarkan kunci sesudah membayar.
 * - notifikasi: menandai sudah dibaca tidak mengubah data usaha apa pun.
 * - sesi portal karyawan: itu masuk dengan PIN, bukan menulis data.
 * Penerimaan scan dari MESIN (`/iclock`, `/api/fingerspot/*`) tidak lewat `route()` sama
 * sekali, jadi absensi tetap masuk saat hanya-baca — data kehadiran yang ditolak mesin hilang
 * atau menumpuk di mesin, dan itu bukan hukuman yang pantas untuk telat bayar.
 */
const JALUR_BEBAS_HANYA_BACA: readonly RegExp[] = [
  /^\/api\/auth(\/|$)/,
  /^\/api\/account\/password$/,
  /^\/api\/lisensi(\/|$)/,
  /^\/api\/notifications(\/|$)/,
  /^\/api\/public\/portal\/[^/]+\/session$/,
];

export function bebasHanyaBaca(jalur: string): boolean {
  return JALUR_BEBAS_HANYA_BACA.some((r) => r.test(jalur));
}
