export type ScoreWeight = { score: number; weight: number };

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Nilai berbobot satu indikator = score * weight / 100. */
export function computeWeightedValue(score: number, weight: number): number {
  return round2((score * weight) / 100);
}

/** Total skor = Σ (score * weight / 100), dibulatkan 2 desimal. */
export function computeTotalScore(scores: ScoreWeight[]): number {
  const total = scores.reduce((sum, s) => sum + (s.score * s.weight) / 100, 0);
  return round2(total);
}

/** Peta skor 1–5 ke grade (sama seperti sistem lama). */
export function gradeFromScore(score: number): string {
  if (score >= 4.5) return "Sangat Baik";
  if (score >= 3.5) return "Baik";
  if (score >= 2.5) return "Cukup";
  if (score >= 1.5) return "Kurang";
  return "Sangat Kurang";
}
