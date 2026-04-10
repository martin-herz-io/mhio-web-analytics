import type { AnalysisCheck, CheckCategory, CheckStatus } from "../types/analysis.js";

interface CreateCheckInput {
  id: string;
  category: CheckCategory;
  status: CheckStatus;
  score: number;
  maxScore: number;
  message: string;
  details?: Record<string, unknown>;
}

export function createCheck({
  id,
  category,
  status,
  score,
  maxScore,
  message,
  details = {},
}: CreateCheckInput): AnalysisCheck {
  return {
    id,
    category,
    status,
    score,
    maxScore,
    message,
    details,
  };
}
