/**
 * Ringkasan penilaian satu bulan untuk aplikasi HP Owner. MURNI supaya bisa diuji.
 */

/** Awal bulan s.d. awal bulan berikutnya (zona server). Parameter kosong/aneh = bulan ini. */
export function rentangBulan(
  yearRaw: string | null,
  monthRaw: string | null,
  now = new Date()
): { mulai: Date; akhir: Date; year: number; month: number } {
  const y = Number(yearRaw);
  const m = Number(monthRaw);
  const year = Number.isInteger(y) && y >= 2000 && y <= 2100 ? y : now.getFullYear();
  const month = Number.isInteger(m) && m >= 1 && m <= 12 ? m : now.getMonth() + 1;
  return { mulai: new Date(year, month - 1, 1), akhir: new Date(year, month, 1), year, month };
}

export type BarisPenilaian = {
  id: number;
  employeeId: number;
  fullName: string;
  department: string | null;
  totalScore: number | null;
  grade: string | null;
  status: "draft" | "completed" | "approved";
  assessmentDate: string;
  evaluator: string | null;
};

/**
 * `rows` urut terbaru dulu. Status dihitung dari SEMUA penilaian bulan itu; daftar karyawan
 * memakai penilaian terakhir per orang; sebaran grade hanya dari yang sudah selesai (draft
 * belum final, jadi gradenya belum boleh dihitung).
 */
export function ringkasPenilaian(rows: BarisPenilaian[]) {
  const status = { draft: 0, completed: 0, approved: 0 };
  const grades: Record<string, number> = {};
  const terakhir = new Map<number, BarisPenilaian>();
  for (const r of rows) {
    status[r.status] += 1;
    if (r.status !== "draft" && r.grade) grades[r.grade] = (grades[r.grade] ?? 0) + 1;
    if (!terakhir.has(r.employeeId)) terakhir.set(r.employeeId, r);
  }
  return { total: rows.length, status, grades, employees: Array.from(terakhir.values()) };
}
