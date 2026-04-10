import type { AnalysisCheck, Recommendation } from "../types/analysis.js";

export function buildRecommendations(checks: AnalysisCheck[]): Recommendation[] {
  return checks
    .filter((check) => check.status !== "good")
    .map((check) => ({
      id: check.id,
      category: check.category,
      priority: (check.status === "bad" ? "high" : "medium") as Recommendation["priority"],
      message: check.message,
    }))
    .slice(0, 6);
}
