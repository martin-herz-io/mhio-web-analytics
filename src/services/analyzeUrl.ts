import type { AnalysisReport, Locale, PerformanceStrategy } from "../types/analysis.js";
import { appConfig } from "../config/env.js";
import { resolveLocale } from "../i18n/index.js";
import { buildPageReport } from "./buildPageReport.js";
import { fetchPage } from "./fetchPage.js";
import { fetchPagePerformance } from "./pageSpeed.js";
import { collectPageDataWithOptions } from "./pageData.js";

export async function analyzeUrl(
  url: string,
  options: { includePerformance?: boolean; performanceStrategy?: PerformanceStrategy; locale?: Locale } = {},
): Promise<AnalysisReport> {
  const locale = resolveLocale(options.locale);
  const page = await fetchPage(url);
  const pageData = collectPageDataWithOptions(page.html, page.finalUrl, {
    requestedUrl: url,
    statusCode: page.statusCode,
    wasRedirected: page.wasRedirected,
    redirectCount: page.redirectCount,
    xRobotsTag: page.headers.xRobotsTag,
  });
  const includePerformance = options.includePerformance ?? appConfig.performance.defaultEnabled;
  const performance = includePerformance
    ? await fetchPagePerformance(page.finalUrl, options.performanceStrategy || appConfig.performance.strategy, locale)
    : null;

  return buildPageReport({
    requestedUrl: url,
    fetchedUrl: page.finalUrl,
    pageData,
    locale,
    performance,
  });
}
