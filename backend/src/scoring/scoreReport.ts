import type { AnalysisCheck, CheckCategory, ScoreBreakdown } from "../types/analysis.js";

const CATEGORY_NAMES: CheckCategory[] = ["seo", "content", "ux"];

function roundScore(value: number): number {
  return Math.round(value);
}

export function scoreReport(checks: AnalysisCheck[]): ScoreBreakdown {
  const perCategory = Object.fromEntries(
    CATEGORY_NAMES.map((category) => {
      const categoryChecks = checks.filter((check) => check.category === category);
      const categoryScore = categoryChecks.reduce((sum, check) => sum + check.score, 0);
      const categoryMax = categoryChecks.reduce((sum, check) => sum + check.maxScore, 0);

      return [category, categoryMax === 0 ? 0 : roundScore((categoryScore / categoryMax) * 100)];
    }),
  ) as Omit<ScoreBreakdown, "overall">;

  const totalScore = checks.reduce((sum, check) => sum + check.score, 0);
  const totalMaxScore = checks.reduce((sum, check) => sum + check.maxScore, 0);

  return {
    overall: totalMaxScore === 0 ? 0 : roundScore((totalScore / totalMaxScore) * 100),
    ...perCategory,
  };
}
