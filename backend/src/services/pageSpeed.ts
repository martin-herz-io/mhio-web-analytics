import type { PerformanceMetric, PerformanceReport, PerformanceStrategy } from "../types/analysis.js";
import { appConfig } from "../config/env.js";
import { text } from "../i18n/index.js";
import type { Locale } from "../types/analysis.js";

const PAGESPEED_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

function readMetric(
  audits: Record<string, { title?: string; displayValue?: string; numericValue?: number }>,
  id: string,
): PerformanceMetric | null {
  const audit = audits[id];

  if (!audit) {
    return null;
  }

  return {
    id,
    title: audit.title || id,
    displayValue: audit.displayValue || "n/a",
    numericValue: audit.numericValue,
  };
}

export async function fetchPagePerformance(
  url: string,
  strategy: PerformanceStrategy = appConfig.performance.strategy,
  locale: Locale = "en",
): Promise<PerformanceReport> {
  const apiUrl = new URL(PAGESPEED_ENDPOINT);
  apiUrl.searchParams.set("url", url);
  apiUrl.searchParams.set("strategy", strategy);
  apiUrl.searchParams.set("category", "performance");

  if (appConfig.performance.apiKey) {
    apiUrl.searchParams.set("key", appConfig.performance.apiKey);
  }

  try {
    const response = await fetch(apiUrl.toString(), {
      headers: {
        accept: "application/json",
      },
      signal: AbortSignal.timeout(appConfig.performance.timeoutMs),
    });

    if (!response.ok) {
      let detailedMessage: string | undefined;
      try {
        const errorPayload = (await response.json()) as { error?: { message?: string } };
        detailedMessage = errorPayload.error?.message;
      } catch {
        detailedMessage = undefined;
      }

      return {
        provider: "pagespeed-insights",
        status: "error",
        strategy,
        score: null,
        metrics: [],
        fetchedAt: new Date().toISOString(),
        message:
          detailedMessage ||
          text(locale, {
            en: `PageSpeed request failed with status ${response.status}`,
            de: `Die PageSpeed-Anfrage ist mit Status ${response.status} fehlgeschlagen`,
          }),
      };
    }

    const payload = (await response.json()) as {
      lighthouseResult?: {
        categories?: {
          performance?: {
            score?: number;
          };
        };
        audits?: Record<string, { title?: string; displayValue?: string; numericValue?: number }>;
      };
    };

    const audits = payload.lighthouseResult?.audits || {};
    const score = payload.lighthouseResult?.categories?.performance?.score;
    const metrics = ["first-contentful-paint", "largest-contentful-paint", "speed-index", "total-blocking-time", "cumulative-layout-shift", "interactive"]
      .map((id) => readMetric(audits, id))
      .filter((metric): metric is PerformanceMetric => metric !== null);

    return {
      provider: "pagespeed-insights",
      status: typeof score === "number" ? "available" : "unavailable",
      strategy,
      score: typeof score === "number" ? Math.round(score * 100) : null,
      metrics,
      fetchedAt: new Date().toISOString(),
      message:
        typeof score === "number"
          ? undefined
          : text(locale, {
              en: "PageSpeed returned no performance category score.",
              de: "PageSpeed hat keinen Score für die Performance-Kategorie zurückgegeben.",
            }),
    };
  } catch (error) {
    return {
      provider: "pagespeed-insights",
      status: "error",
      strategy,
      score: null,
      metrics: [],
      fetchedAt: new Date().toISOString(),
      message: error instanceof Error
        ? error.message
        : text(locale, {
            en: "Unknown PageSpeed error",
            de: "Unbekannter PageSpeed-Fehler",
          }),
    };
  }
}
