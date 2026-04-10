import type { AnalysisCheck, ReportSummary } from "../types/analysis.js";

export function buildSummary(checks: AnalysisCheck[]): ReportSummary {
  const strengths = checks
    .filter((check) => check.status === "good")
    .slice(0, 3)
    .map((check) => check.message);
  const issues = checks
    .filter((check) => check.status !== "good")
    .slice(0, 5)
    .map((check) => check.message);

  return {
    strengths,
    issues,
  };
}
