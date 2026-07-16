import type { PrismaClient } from "@prisma/client";
import { computeWeightedValue, computeTotalScore, gradeFromScore } from "@/lib/services/grade";

export type ScoreInput = { indicatorId: number; score: number; notes?: string | null };

export type BuiltScores = {
  scoreRows: {
    indicatorId: number;
    score: number;
    weightedValue: number;
    notes: string | null;
  }[];
  totalScore: number;
  grade: string;
};

/**
 * Ambil bobot indikator dari DB, hitung weightedValue tiap skor + total + grade.
 * Hanya memakai indikator milik template terkait (abaikan indicatorId asing).
 */
export async function buildScores(
  prisma: PrismaClient,
  templateId: number,
  scores: ScoreInput[]
): Promise<BuiltScores> {
  const indicators = await prisma.assessmentIndicator.findMany({
    where: { templateId },
    select: { id: true, weight: true },
  });
  const weightById = new Map(indicators.map((i) => [i.id, Number(i.weight)]));

  const scoreRows = scores
    .filter((s) => weightById.has(s.indicatorId))
    .map((s) => {
      const weight = weightById.get(s.indicatorId)!;
      return {
        indicatorId: s.indicatorId,
        score: s.score,
        weightedValue: computeWeightedValue(s.score, weight),
        notes: s.notes ?? null,
      };
    });

  const totalScore = computeTotalScore(
    scoreRows.map((r) => ({ score: r.score, weight: weightById.get(r.indicatorId)! }))
  );

  return { scoreRows, totalScore, grade: gradeFromScore(totalScore) };
}
