import { runContentChecks } from "../analyzers/contentChecks.js";
import { runSeoChecks } from "../analyzers/seoChecks.js";
import { runUxChecks } from "../analyzers/uxChecks.js";
import { buildRecommendations } from "../scoring/buildRecommendations.js";
import { buildSummary } from "../scoring/buildSummary.js";
import { scoreReport } from "../scoring/scoreReport.js";
import type { AnalysisReport, PageData, PerformanceReport } from "../types/analysis.js";

export function buildPageReport(input: {
  requestedUrl: string;
  fetchedUrl: string;
  pageData: PageData;
  analyzedAt?: string;
  performance?: PerformanceReport | null;
}): AnalysisReport {
  const checks = [
    ...runSeoChecks(input.pageData),
    ...runContentChecks(input.pageData),
    ...runUxChecks(input.pageData),
  ];
  const scores = scoreReport(checks);

  return {
    url: input.requestedUrl,
    fetchedUrl: input.fetchedUrl,
    analyzedAt: input.analyzedAt || new Date().toISOString(),
    scores,
    metrics: {
      wordCount: input.pageData.wordCount,
      sentenceCount: input.pageData.sentenceCount,
      paragraphCount: input.pageData.paragraphs.length,
      headingCount: input.pageData.headings.length,
      imageCount: input.pageData.images.length,
      linkCount: input.pageData.links.length,
      internalLinkCount: input.pageData.internalLinks,
      externalLinkCount: input.pageData.externalLinks,
      buttonCount: input.pageData.buttonCount,
      listCount: input.pageData.listCount,
      brokenInternalLinkCount: input.pageData.brokenInternalLinkCount,
      hreflangCount: input.pageData.hreflangLinks.length,
      structuredDataTypeCount: input.pageData.structuredDataTypes.length,
      validStructuredDataCount: input.pageData.structuredDataValidations.filter((entry) => entry.isValid).length,
      invalidStructuredDataCount: input.pageData.structuredDataValidations.filter((entry) => !entry.isValid).length,
      isNoindex: input.pageData.isNoindex,
      hasXRobotsTag: input.pageData.xRobotsTag.length > 0,
    },
    summary: buildSummary(checks),
    recommendations: buildRecommendations(checks),
    checks,
    performance: input.performance || null,
  };
}
