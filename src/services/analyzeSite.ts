import { buildRecommendations } from "../scoring/buildRecommendations.js";
import { buildSummary } from "../scoring/buildSummary.js";
import { scoreReport } from "../scoring/scoreReport.js";
import { appConfig } from "../config/env.js";
import { resolveLocale, text } from "../i18n/index.js";
import type {
  CrawledPageResult,
  LinkGraphReport,
  SiteAnalysisReport,
  SiteIssue,
  SiteMetrics,
  PerformanceStrategy,
  Recommendation,
  AnalysisCheck,
  PageData,
  Locale,
} from "../types/analysis.js";
import { buildPageReport } from "./buildPageReport.js";
import { discoverRobots, discoverSitemapUrls, isAllowedByRobots } from "./crawlDiscovery.js";
import { fetchPage } from "./fetchPage.js";
import { fetchPagePerformance } from "./pageSpeed.js";
import { collectPageDataWithOptions } from "./pageData.js";

function normalizeUrl(url: string, baseUrl?: string): string | null {
  try {
    const normalized = new URL(url, baseUrl);

    if (!["http:", "https:"].includes(normalized.protocol)) {
      return null;
    }

    normalized.hash = "";

    if ((normalized.protocol === "https:" && normalized.port === "443") || (normalized.protocol === "http:" && normalized.port === "80")) {
      normalized.port = "";
    }

    if (normalized.pathname !== "/") {
      normalized.pathname = normalized.pathname.replace(/\/+$/, "");
    }

    normalized.searchParams.sort();

    return normalized.toString();
  } catch {
    return null;
  }
}

function normalizeSiteUrl(url: string): string {
  const normalized = normalizeUrl(url);

  if (!normalized) {
    throw new Error("Invalid site URL");
  }

  return normalized;
}

function normalizeDiscoveredUrl(url: string, origin: string): string | null {
  const normalized = normalizeUrl(url, origin);

  if (!normalized) {
    return null;
  }

  const resolved = new URL(normalized);

  if (resolved.origin !== origin) {
    return null;
  }

  return normalized;
}

function enqueueUrl(
  queue: Array<{ url: string; depth: number }>,
  queuedUrls: Set<string>,
  url: string,
  depth: number,
  pageLimit: number,
): boolean {
  if (queuedUrls.has(url) || queue.length >= pageLimit) {
    return false;
  }

  queue.push({ url, depth });
  queuedUrls.add(url);
  return true;
}

function dequeueBatch(
  queue: Array<{ url: string; depth: number }>,
  queuedUrls: Set<string>,
  size: number,
): Array<{ url: string; depth: number }> {
  const batch: Array<{ url: string; depth: number }> = [];

  while (queue.length > 0 && batch.length < size) {
    const next = queue.shift();

    if (!next) {
      break;
    }

    queuedUrls.delete(next.url);
    batch.push(next);
  }

  return batch;
}

function registerVisited(visited: Set<string>, ...urls: Array<string | null | undefined>) {
  for (const url of urls) {
    if (url) {
      visited.add(url);
    }
  }
}

async function processCrawlTarget(input: {
  current: { url: string; depth: number };
  origin: string;
  robotsData: Awaited<ReturnType<typeof discoverRobots>>;
  visited: Set<string>;
  locale: Locale;
  includePerformance?: boolean;
  performanceStrategy?: PerformanceStrategy;
}): Promise<
  | {
      page: CrawledPageResult;
      discoveredUrls: string[];
      blockedByRobots: number;
      aliases: string[];
      outgoingInternalLinks: string[];
    }
  | {
      skipped: true;
      blockedByRobots: number;
      aliases: string[];
    }
> {
  const { current, origin, robotsData, visited } = input;

  if (visited.has(current.url)) {
    return {
      skipped: true,
      blockedByRobots: 0,
      aliases: [],
    };
  }

  if (!isAllowedByRobots(current.url, origin, robotsData.disallowRules)) {
    registerVisited(visited, current.url);
    return {
      skipped: true,
      blockedByRobots: 1,
      aliases: [current.url],
    };
  }

  registerVisited(visited, current.url);

  try {
    const fetchedPage = await fetchPage(current.url);
    const normalizedFetchedUrl = normalizeDiscoveredUrl(fetchedPage.finalUrl, origin) || fetchedPage.finalUrl;
    registerVisited(visited, normalizedFetchedUrl);

    const pageData = collectPageDataWithOptions(fetchedPage.html, fetchedPage.finalUrl, {
      requestedUrl: current.url,
      statusCode: fetchedPage.statusCode,
      wasRedirected: fetchedPage.wasRedirected,
      redirectCount: fetchedPage.redirectCount,
      xRobotsTag: fetchedPage.headers.xRobotsTag,
    });
    const brokenInternalLinkCount = await detectBrokenInternalLinks(pageData, origin);
    const includePerformance = input.includePerformance ?? appConfig.performance.defaultEnabled;
    const performance = includePerformance
      ? await fetchPagePerformance(
          fetchedPage.finalUrl,
          input.performanceStrategy || appConfig.performance.strategy,
          input.locale,
        )
      : null;
    const report = buildPageReport({
      requestedUrl: current.url,
      fetchedUrl: fetchedPage.finalUrl,
      locale: input.locale,
      pageData: {
        ...pageData,
        brokenInternalLinkCount,
      },
      performance,
    });

    const discoveredUrls: string[] = [];
    const outgoingInternalLinks: string[] = [];
    let blockedByRobots = 0;

    for (const link of pageData.links.filter((entry) => entry.isInternal)) {
      const normalizedLink = normalizeDiscoveredUrl(link.href, origin);

      if (!normalizedLink) {
        continue;
      }

      outgoingInternalLinks.push(normalizedLink);

      if (visited.has(normalizedLink)) {
        continue;
      }

      if (!isAllowedByRobots(normalizedLink, origin, robotsData.disallowRules)) {
        blockedByRobots += 1;
        continue;
      }

      discoveredUrls.push(normalizedLink);
    }

    return {
      page: {
        url: current.url,
        depth: current.depth,
        status: "analyzed",
        report,
        pageMeta: {
          title: pageData.title,
          metaDescription: pageData.metaDescription,
          canonical: pageData.canonical,
          canonicalTarget: normalizeCanonicalTarget(pageData.canonical, fetchedPage.finalUrl),
          requestedUrl: current.url,
          fetchedUrl: fetchedPage.finalUrl,
          isNoindex: pageData.isNoindex,
          xRobotsTag: pageData.xRobotsTag,
          statusCode: fetchedPage.statusCode,
          wasRedirected: fetchedPage.wasRedirected,
          brokenInternalLinkCount,
          hreflangCount: pageData.hreflangLinks.length,
          structuredDataTypeCount: pageData.structuredDataTypes.length,
          invalidStructuredDataCount: pageData.structuredDataValidations.filter((entry) => !entry.isValid).length,
          wordCount: pageData.wordCount,
          contentFingerprint: createContentFingerprint(pageData.bodyText),
          outgoingInternalUrls: Array.from(new Set(outgoingInternalLinks)),
          hreflangValues: pageData.hreflangLinks.map((entry) => entry.hreflang),
          hreflangTargets: pageData.hreflangLinks
            .map((entry) => normalizeDiscoveredUrl(entry.href, origin))
            .filter((entry): entry is string => Boolean(entry)),
          mainContentWordCount: pageData.mainContentWordCount,
          boilerplateWordCount: pageData.boilerplateWordCount,
        },
      },
      discoveredUrls,
      blockedByRobots,
      aliases: [current.url, normalizedFetchedUrl],
      outgoingInternalLinks,
    };
  } catch (error) {
    return {
      page: {
        url: current.url,
        depth: current.depth,
        status: "failed",
        error: error instanceof Error ? error.message : text(input.locale, { en: "Unknown crawl error", de: "Unbekannter Crawl-Fehler" }),
      },
      discoveredUrls: [],
      blockedByRobots: 0,
      aliases: [current.url],
      outgoingInternalLinks: [],
    };
  }
}

function clampMaxPages(maxPages?: number): number {
  if (!maxPages || Number.isNaN(maxPages)) {
    return Math.min(appConfig.crawler.defaultMaxPages, appConfig.crawler.hardMaxPages);
  }

  return Math.min(Math.max(1, maxPages), appConfig.crawler.hardMaxPages);
}

function collectDuplicateCount(values: string[]): number {
  const counts = new Map<string, number>();

  for (const value of values.filter(Boolean)) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }

  return Array.from(counts.values()).filter((count) => count > 1).length;
}

function collectDuplicateGroups(values: string[]): string[][] {
  const counts = new Map<string, string[]>();

  for (const value of values.filter(Boolean)) {
    const bucket = counts.get(value) || [];
    bucket.push(value);
    counts.set(value, bucket);
  }

  return Array.from(counts.values()).filter((group) => group.length > 1);
}

function createContentFingerprint(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim()
    .slice(0, 500);
}

function normalizeCanonicalTarget(canonical: string, baseUrl: string): string {
  const normalized = normalizeUrl(canonical, baseUrl);
  return normalized || "";
}

function buildCanonicalClusters(analyzedPages: Array<CrawledPageResult & { report: NonNullable<CrawledPageResult["report"]> }>): string[][] {
  const groups = new Map<string, string[]>();

  for (const page of analyzedPages) {
    const target = page.pageMeta?.canonicalTarget || "";

    if (!target) {
      continue;
    }

    const bucket = groups.get(target) || [];
    bucket.push(page.report.fetchedUrl);
    groups.set(target, bucket);
  }

  return Array.from(groups.values()).filter((group) => new Set(group).size > 1);
}

function collectHreflangInconsistencies(analyzedPages: Array<CrawledPageResult & { report: NonNullable<CrawledPageResult["report"]> }>): string[] {
  const byUrl = new Map<string, CrawledPageResult & { report: NonNullable<CrawledPageResult["report"]> }>();

  for (const page of analyzedPages) {
    byUrl.set(page.report.fetchedUrl, page);
  }

  const inconsistent = new Set<string>();

  for (const page of analyzedPages) {
    const sourceUrl = page.report.fetchedUrl;

    for (const targetUrl of page.pageMeta?.hreflangTargets || []) {
      const targetPage = byUrl.get(targetUrl);

      if (!targetPage) {
        continue;
      }

      const hasReturnLink = (targetPage.pageMeta?.hreflangTargets || []).includes(sourceUrl);

      if (!hasReturnLink) {
        inconsistent.add(sourceUrl);
      }
    }
  }

  return Array.from(inconsistent);
}

function collectBoilerplateDominatedPages(analyzedPages: Array<CrawledPageResult & { report: NonNullable<CrawledPageResult["report"]> }>): string[] {
  return analyzedPages
    .filter((page) => {
      const mainWords = page.pageMeta?.mainContentWordCount || 0;
      const boilerplateWords = page.pageMeta?.boilerplateWordCount || 0;
      const totalWords = mainWords + boilerplateWords;

      if (totalWords < 60) {
        return false;
      }

      return totalWords > 0 && mainWords / totalWords < 0.45;
    })
    .map((page) => page.url);
}

function buildSiteIssues(pages: CrawledPageResult[], locale: Locale): SiteIssue[] {
  const analyzedPages = pages.filter((page): page is CrawledPageResult & { report: NonNullable<CrawledPageResult["report"]> } => page.status === "analyzed" && Boolean(page.report));
  const failedPages = pages.filter((page) => page.status === "failed");
  const pagesWithoutMeta = analyzedPages.filter((page) =>
    page.report.checks.some((check) => check.id === "seo-meta-description" && check.status === "bad"),
  );
  const pagesWithoutH1 = analyzedPages.filter((page) =>
    page.report.checks.some((check) => check.id === "seo-h1" && check.status === "bad"),
  );
  const pagesWithLongParagraphs = analyzedPages.filter((page) =>
    page.report.checks.some((check) => check.id === "content-long-paragraphs" && check.status === "bad"),
  );
  const noindexPages = analyzedPages.filter((page) => page.pageMeta?.isNoindex);
  const xRobotsPages = analyzedPages.filter((page) => (page.pageMeta?.xRobotsTag || "").length > 0);
  const hreflangPages = analyzedPages.filter((page) => (page.pageMeta?.hreflangCount || 0) > 0);
  const structuredDataPages = analyzedPages.filter((page) => (page.pageMeta?.structuredDataTypeCount || 0) > 0);
  const invalidStructuredDataPages = analyzedPages.filter((page) => (page.pageMeta?.invalidStructuredDataCount || 0) > 0);
  const thinContentPages = analyzedPages.filter((page) => (page.pageMeta?.wordCount || 0) < 120);
  const duplicateContentFingerprints = collectDuplicateGroups(analyzedPages.map((page) => page.pageMeta?.contentFingerprint || ""));
  const canonicalClusters = buildCanonicalClusters(analyzedPages);
  const hreflangInconsistencyPages = collectHreflangInconsistencies(analyzedPages);
  const boilerplateDominatedPages = collectBoilerplateDominatedPages(analyzedPages);
  const canonicalConflictPages = analyzedPages.filter((page) =>
    page.report.checks.some((check) => check.id === "seo-canonical" && check.status === "bad"),
  );
  const brokenInternalLinkPages = analyzedPages.filter((page) => (page.pageMeta?.brokenInternalLinkCount || 0) > 0);
  const linkGraph = buildLinkGraph(pages);

  const issues: SiteIssue[] = [];

  if (failedPages.length > 0) {
    issues.push({
      id: "site-fetch-failures",
      severity: "high",
      message: text(locale, {
        en: "Some pages could not be fetched or analyzed.",
        de: "Einige Seiten konnten nicht geladen oder analysiert werden.",
      }),
      affectedPages: failedPages.map((page) => page.url),
    });
  }

  if (pagesWithoutMeta.length > 0) {
    issues.push({
      id: "site-missing-meta-description",
      severity: pagesWithoutMeta.length >= 3 ? "high" : "medium",
      message: text(locale, {
        en: "Multiple pages are missing a meta description.",
        de: "Mehrere Seiten haben keine Meta Description.",
      }),
      affectedPages: pagesWithoutMeta.map((page) => page.url),
    });
  }

  if (pagesWithoutH1.length > 0) {
    issues.push({
      id: "site-missing-h1",
      severity: pagesWithoutH1.length >= 3 ? "high" : "medium",
      message: text(locale, {
        en: "Multiple pages are missing an H1.",
        de: "Auf mehreren Seiten fehlt eine H1.",
      }),
      affectedPages: pagesWithoutH1.map((page) => page.url),
    });
  }

  if (pagesWithLongParagraphs.length > 0) {
    issues.push({
      id: "site-long-paragraphs",
      severity: pagesWithLongParagraphs.length >= 3 ? "medium" : "low",
      message: text(locale, {
        en: "Multiple pages contain very long text blocks that reduce readability.",
        de: "Mehrere Seiten enthalten schwer lesbare, sehr lange Textblöcke.",
      }),
      affectedPages: pagesWithLongParagraphs.map((page) => page.url),
    });
  }

  if (noindexPages.length > 0) {
    issues.push({
      id: "site-noindex-pages",
      severity: noindexPages.length >= 3 ? "high" : "medium",
      message: text(locale, {
        en: "Multiple analyzed pages are set to noindex.",
        de: "Mehrere analysierte Seiten sind auf noindex gesetzt.",
      }),
      affectedPages: noindexPages.map((page) => page.url),
    });
  }

  if (canonicalConflictPages.length > 0) {
    issues.push({
      id: "site-canonical-conflicts",
      severity: canonicalConflictPages.length >= 2 ? "high" : "medium",
      message: text(locale, {
        en: "Some pages have canonical targets that do not match the analyzed URL.",
        de: "Einige Seiten haben Canonical-Ziele, die nicht zur analysierten URL passen.",
      }),
      affectedPages: canonicalConflictPages.map((page) => page.url),
    });
  }

  if (brokenInternalLinkPages.length > 0) {
    issues.push({
      id: "site-broken-internal-links",
      severity: brokenInternalLinkPages.length >= 2 ? "high" : "medium",
      message: text(locale, {
        en: "Broken internal links were found across multiple pages.",
        de: "Auf mehreren Seiten wurden defekte interne Links gefunden.",
      }),
      affectedPages: brokenInternalLinkPages.map((page) => page.url),
    });
  }

  if (structuredDataPages.length === 0 && analyzedPages.length > 0) {
    issues.push({
      id: "site-missing-structured-data",
      severity: "medium",
      message: text(locale, {
        en: "No structured JSON-LD markup was detected on the analyzed pages.",
        de: "Auf den analysierten Seiten wurde kein strukturiertes JSON-LD-Markup erkannt.",
      }),
      affectedPages: analyzedPages.map((page) => page.url),
    });
  }

  if (hreflangPages.length === 0 && analyzedPages.length > 1) {
    issues.push({
      id: "site-missing-hreflang",
      severity: "low",
      message: text(locale, {
        en: "No hreflang references were detected.",
        de: "Es wurden keine hreflang-Verweise erkannt.",
      }),
      affectedPages: analyzedPages.map((page) => page.url),
    });
  }

  if (invalidStructuredDataPages.length > 0) {
    issues.push({
      id: "site-invalid-structured-data",
      severity: invalidStructuredDataPages.length >= 2 ? "medium" : "low",
      message: text(locale, {
        en: "Some pages contain incomplete structured data.",
        de: "Einige Seiten enthalten unvollständige strukturierte Daten.",
      }),
      affectedPages: invalidStructuredDataPages.map((page) => page.url),
    });
  }

  if (thinContentPages.length > 0) {
    issues.push({
      id: "site-thin-content",
      severity: thinContentPages.length >= 3 ? "medium" : "low",
      message: text(locale, {
        en: "Multiple pages contain very little original content.",
        de: "Mehrere Seiten enthalten nur sehr wenig eigenständigen Inhalt.",
      }),
      affectedPages: thinContentPages.map((page) => page.url),
    });
  }

  if (duplicateContentFingerprints.length > 0) {
    issues.push({
      id: "site-duplicate-content",
      severity: duplicateContentFingerprints.length >= 2 ? "high" : "medium",
      message: text(locale, {
        en: "Pages with very similar or identical content were detected.",
        de: "Es wurden Seiten mit sehr ähnlichem oder identischem Inhalt erkannt.",
      }),
      affectedPages: analyzedPages
        .filter((page) =>
          duplicateContentFingerprints.some((group) => group.includes(page.pageMeta?.contentFingerprint || "")),
        )
        .map((page) => page.url),
    });
  }

  if (linkGraph.pagesWithoutIncomingInternalLinks.length > 0) {
    issues.push({
      id: "site-unlinked-pages",
      severity: linkGraph.pagesWithoutIncomingInternalLinks.length >= 2 ? "medium" : "low",
      message: text(locale, {
        en: "Some crawled pages do not have any incoming internal links.",
        de: "Einige gecrawlte Seiten haben keine eingehenden internen Links.",
      }),
      affectedPages: linkGraph.pagesWithoutIncomingInternalLinks,
    });
  }

  if (linkGraph.weaklyLinkedPages.length > 0) {
    issues.push({
      id: "site-weak-internal-linking",
      severity: linkGraph.weaklyLinkedPages.length >= 3 ? "medium" : "low",
      message: text(locale, {
        en: "Multiple pages are only weakly linked internally.",
        de: "Mehrere Seiten sind intern nur sehr schwach verlinkt.",
      }),
      affectedPages: linkGraph.weaklyLinkedPages,
    });
  }

  if (canonicalClusters.length > 0) {
    issues.push({
      id: "site-canonical-clusters",
      severity: canonicalClusters.length >= 2 ? "medium" : "low",
      message: text(locale, {
        en: "Multiple pages form the same canonical clusters.",
        de: "Mehrere Seiten bilden dieselben Canonical-Cluster.",
      }),
      affectedPages: canonicalClusters.flat(),
    });
  }

  if (hreflangInconsistencyPages.length > 0) {
    issues.push({
      id: "site-hreflang-inconsistencies",
      severity: hreflangInconsistencyPages.length >= 2 ? "medium" : "low",
      message: text(locale, {
        en: "Some hreflang references are not reciprocal or are incomplete.",
        de: "Einige hreflang-Verweise sind nicht gegenseitig oder unvollständig.",
      }),
      affectedPages: hreflangInconsistencyPages,
    });
  }

  if (boilerplateDominatedPages.length > 0) {
    issues.push({
      id: "site-boilerplate-heavy-pages",
      severity: boilerplateDominatedPages.length >= 2 ? "medium" : "low",
      message: text(locale, {
        en: "Some pages appear heavily dominated by template or boilerplate content.",
        de: "Einige Seiten wirken stark template- oder boilerplate-dominiert.",
      }),
      affectedPages: boilerplateDominatedPages,
    });
  }

  return issues;
}

function buildSiteMetrics(pages: CrawledPageResult[]): SiteMetrics {
  const analyzedPages = pages.filter((page): page is CrawledPageResult & { report: NonNullable<CrawledPageResult["report"]> } => page.status === "analyzed" && Boolean(page.report));
  const duplicateTitles = collectDuplicateCount(analyzedPages.map((page) => page.pageMeta?.title || ""));
  const duplicateMetaDescriptions = collectDuplicateCount(analyzedPages.map((page) => page.pageMeta?.metaDescription || ""));
  const xRobotsPages = analyzedPages.filter((page) => (page.pageMeta?.xRobotsTag || "").length > 0);
  const hreflangPages = analyzedPages.filter((page) => (page.pageMeta?.hreflangCount || 0) > 0);
  const structuredDataPages = analyzedPages.filter((page) => (page.pageMeta?.structuredDataTypeCount || 0) > 0);
  const invalidStructuredDataPages = analyzedPages.filter((page) => (page.pageMeta?.invalidStructuredDataCount || 0) > 0);
  const thinContentPages = analyzedPages.filter((page) => (page.pageMeta?.wordCount || 0) < 120);
  const duplicateContentGroups = collectDuplicateGroups(analyzedPages.map((page) => page.pageMeta?.contentFingerprint || ""));
  const linkGraph = buildLinkGraph(pages);
  const canonicalClusters = buildCanonicalClusters(analyzedPages);
  const hreflangInconsistencyPages = collectHreflangInconsistencies(analyzedPages);
  const boilerplateDominatedPages = collectBoilerplateDominatedPages(analyzedPages);
  const performanceScores = analyzedPages
    .map((page) => page.report.performance?.score)
    .filter((score): score is number => typeof score === "number");
  const averageWordCount =
    analyzedPages.length === 0
      ? 0
      : Math.round(analyzedPages.reduce((sum, page) => sum + page.report.metrics.wordCount, 0) / analyzedPages.length);
  const averageScore =
    analyzedPages.length === 0
      ? 0
      : Math.round(analyzedPages.reduce((sum, page) => sum + page.report.scores.overall, 0) / analyzedPages.length);
  const averagePerformanceScore =
    performanceScores.length === 0 ? null : Math.round(performanceScores.reduce((sum, score) => sum + score, 0) / performanceScores.length);

  return {
    crawledPages: pages.length,
    analyzedPages: analyzedPages.length,
    failedPages: pages.filter((page) => page.status === "failed").length,
    averageWordCount,
    averageScore,
    averagePerformanceScore,
    pagesWithPerformanceData: performanceScores.length,
    duplicateTitleCount: duplicateTitles,
    duplicateMetaDescriptionCount: duplicateMetaDescriptions,
    duplicateContentGroups: duplicateContentGroups.length,
    thinContentPages: thinContentPages.length,
    canonicalClusterCount: canonicalClusters.length,
    hreflangInconsistencyPages: hreflangInconsistencyPages.length,
    pagesWithLowMainContentShare: boilerplateDominatedPages.length,
    pagesWithoutIncomingInternalLinks: linkGraph.pagesWithoutIncomingInternalLinks.length,
    weaklyLinkedPages: linkGraph.weaklyLinkedPages.length,
    pagesWithoutH1: analyzedPages.filter((page) => page.report.checks.some((check) => check.id === "seo-h1" && check.status === "bad")).length,
    pagesWithoutMetaDescription: analyzedPages.filter((page) =>
      page.report.checks.some((check) => check.id === "seo-meta-description" && check.status === "bad"),
    ).length,
    pagesWithLongParagraphIssues: analyzedPages.filter((page) =>
      page.report.checks.some((check) => check.id === "content-long-paragraphs" && check.status === "bad"),
    ).length,
    pagesWithoutCanonical: analyzedPages.filter((page) =>
      page.report.checks.some((check) => check.id === "seo-canonical" && check.status !== "good"),
    ).length,
    noindexPages: analyzedPages.filter((page) => page.pageMeta?.isNoindex).length,
    xRobotsTagPages: xRobotsPages.length,
    hreflangPages: hreflangPages.length,
    structuredDataPages: structuredDataPages.length,
    pagesWithInvalidStructuredData: invalidStructuredDataPages.length,
    redirectedPages: analyzedPages.filter((page) => page.pageMeta?.wasRedirected).length,
    canonicalConflictPages: analyzedPages.filter((page) =>
      page.report.checks.some((check) => check.id === "seo-canonical" && check.status === "bad"),
    ).length,
    pagesWithBrokenInternalLinks: analyzedPages.filter((page) => (page.pageMeta?.brokenInternalLinkCount || 0) > 0).length,
    maxDepthReached: pages.reduce((max, page) => Math.max(max, page.depth), 0),
  };
}

function buildLinkGraph(pages: CrawledPageResult[]): LinkGraphReport {
  const analyzedPages = pages.filter((page): page is CrawledPageResult & { report: NonNullable<CrawledPageResult["report"]> } => page.status === "analyzed" && Boolean(page.report));
  const incomingCounts = new Map<string, number>();
  const outgoingCounts = new Map<string, number>();
  const pageDepths = new Map<string, number>();

  for (const page of analyzedPages) {
    const pageUrl = page.report.fetchedUrl;
    pageDepths.set(pageUrl, page.depth);
    incomingCounts.set(pageUrl, incomingCounts.get(pageUrl) || 0);
    outgoingCounts.set(pageUrl, page.pageMeta?.outgoingInternalUrls.length || 0);
  }
  const urlSet = new Set(analyzedPages.map((page) => page.report.fetchedUrl));
  let edgeCount = 0;

  for (const page of analyzedPages) {
    const uniqueOutgoing = new Set((page.pageMeta?.outgoingInternalUrls || []).filter((url) => urlSet.has(url)));

    edgeCount += uniqueOutgoing.size;

    for (const targetUrl of uniqueOutgoing) {
      incomingCounts.set(targetUrl, (incomingCounts.get(targetUrl) || 0) + 1);
    }
  }

  const pagesWithoutIncomingInternalLinks: string[] = [];
  const weaklyLinkedPages: string[] = [];

  for (const page of analyzedPages) {
    const pageUrl = page.report.fetchedUrl;
    const incoming = incomingCounts.get(pageUrl) || 0;

    if (incoming === 0 && page.depth > 0) {
      pagesWithoutIncomingInternalLinks.push(pageUrl);
    }

    if (incoming <= 1 && page.depth > 0) {
      weaklyLinkedPages.push(pageUrl);
    }
  }

  const maxDepth = analyzedPages.reduce((max, page) => Math.max(max, page.depth), 0);
  const deepestPages = analyzedPages.filter((page) => page.depth === maxDepth).map((page) => page.report.fetchedUrl);

  return {
    nodes: analyzedPages.map((page) => ({
      url: page.report.fetchedUrl,
      incomingInternalLinks: incomingCounts.get(page.report.fetchedUrl) || 0,
      outgoingInternalLinks: outgoingCounts.get(page.report.fetchedUrl) || 0,
      depth: page.depth,
    })),
    edgeCount,
    pagesWithoutIncomingInternalLinks,
    weaklyLinkedPages,
    deepestPages,
  };
}

async function detectBrokenInternalLinks(pageData: PageData, origin: string): Promise<number> {
  const seen = new Set<string>();
  let brokenCount = 0;

  for (const link of pageData.links) {
    if (!link.isInternal || !link.resolvedUrl || seen.has(link.resolvedUrl)) {
      continue;
    }

    seen.add(link.resolvedUrl);

    try {
      const normalized = new URL(link.resolvedUrl);

      if (normalized.origin !== origin) {
        continue;
      }

      const response = await fetch(link.resolvedUrl, {
        method: appConfig.crawler.brokenLinkCheckMethod,
        headers: {
          "user-agent": appConfig.http.userAgent,
          accept: "text/html,application/xhtml+xml,*/*",
        },
        redirect: appConfig.crawler.followRedirects ? "follow" : "manual",
        signal: AbortSignal.timeout(appConfig.http.requestTimeoutMs),
      });

      if (!response.ok) {
        brokenCount += 1;
      }
    } catch {
      brokenCount += 1;
    }
  }

  return brokenCount;
}

function aggregateSiteChecks(pages: CrawledPageResult[]): AnalysisCheck[] {
  const analyzedPages = pages.filter((page): page is CrawledPageResult & { report: NonNullable<CrawledPageResult["report"]> } => page.status === "analyzed" && Boolean(page.report));

  if (analyzedPages.length === 0) {
    return [];
  }

  const checksById = new Map<string, AnalysisCheck[]>();

  for (const page of analyzedPages) {
    for (const check of page.report.checks) {
      const bucket = checksById.get(check.id) || [];
      bucket.push(check);
      checksById.set(check.id, bucket);
    }
  }

  return Array.from(checksById.entries()).map(([id, checks]) => {
    const score = Math.round(checks.reduce((sum, check) => sum + check.score, 0) / checks.length);
    const maxScore = Math.round(checks.reduce((sum, check) => sum + check.maxScore, 0) / checks.length);
    const badCount = checks.filter((check) => check.status === "bad").length;
    const warningCount = checks.filter((check) => check.status === "warning").length;
    const status = badCount > 0 ? "bad" : warningCount > 0 ? "warning" : "good";

    return {
      id,
      category: checks[0].category,
      status,
      score,
      maxScore,
      message: checks[0].message,
      details: {
        pageCount: checks.length,
        badCount,
        warningCount,
      },
    };
  });
}

export async function analyzeSite(
  url: string,
  maxPages?: number,
  options: { includePerformance?: boolean; performanceStrategy?: PerformanceStrategy; locale?: Locale } = {},
): Promise<SiteAnalysisReport> {
  const locale = resolveLocale(options.locale);
  const normalizedUrl = normalizeSiteUrl(url);
  const origin = new URL(normalizedUrl).origin;
  const pageLimit = clampMaxPages(maxPages);
  const concurrency = Math.min(appConfig.crawler.concurrency, pageLimit);
  const queue: Array<{ url: string; depth: number }> = [];
  const queuedUrls = new Set<string>();
  const visited = new Set<string>();
  const pages: CrawledPageResult[] = [];
  const robotsData = await discoverRobots(origin);
  const sitemapPageUrls = await discoverSitemapUrls(origin, robotsData);
  let blockedByRobots = 0;
  let seededFromSitemaps = 0;

  enqueueUrl(queue, queuedUrls, normalizedUrl, 0, pageLimit);

  for (const sitemapUrl of sitemapPageUrls) {
    if (pages.length + queue.length >= pageLimit) {
      break;
    }

    const normalizedSitemapUrl = normalizeDiscoveredUrl(sitemapUrl, origin);

    if (!normalizedSitemapUrl) {
      continue;
    }

    if (!isAllowedByRobots(normalizedSitemapUrl, origin, robotsData.disallowRules)) {
      blockedByRobots += 1;
      continue;
    }

    if (enqueueUrl(queue, queuedUrls, normalizedSitemapUrl, 1, pageLimit)) {
      seededFromSitemaps += 1;
    }
  }

  while (queue.length > 0 && pages.length < pageLimit) {
    const availableSlots = Math.max(0, pageLimit - pages.length);
    const batch = dequeueBatch(queue, queuedUrls, Math.min(concurrency, availableSlots));

    if (batch.length === 0) {
      break;
    }

    const results = await Promise.all(
      batch.map((current) =>
        processCrawlTarget({
          current,
          origin,
          robotsData,
          visited,
          locale,
          includePerformance: options.includePerformance ?? appConfig.performance.defaultEnabled,
          performanceStrategy: options.performanceStrategy,
        }),
      ),
    );

    for (const [index, result] of results.entries()) {
      blockedByRobots += result.blockedByRobots;
      registerVisited(visited, ...result.aliases);

      if ("skipped" in result) {
        continue;
      }

      pages.push(result.page);

      if (pages.length >= pageLimit) {
        continue;
      }

      for (const discoveredUrl of result.discoveredUrls) {
        if (pages.length + queue.length >= pageLimit) {
          break;
        }

        enqueueUrl(queue, queuedUrls, discoveredUrl, batch[index].depth + 1, pageLimit);
      }
    }
  }

  const siteChecks = aggregateSiteChecks(pages);
  const scores = scoreReport(siteChecks);
  const summary = buildSummary(siteChecks);
  const metrics = buildSiteMetrics(pages);
  const linkGraph = buildLinkGraph(pages);
  const siteIssues = buildSiteIssues(pages, locale);
  const recommendations: Recommendation[] = [
    ...buildRecommendations(siteChecks),
    ...siteIssues.slice(0, 3).map((issue) => ({
      id: issue.id,
      category: "seo" as Recommendation["category"],
      priority:
        (issue.severity === "high" ? "high" : issue.severity === "medium" ? "medium" : "low") as Recommendation["priority"],
      message: issue.message,
    })),
  ].slice(0, 8);

  return {
    url: normalizedUrl,
    analyzedAt: new Date().toISOString(),
    locale,
    crawl: {
      maxPages: pageLimit,
      crawledPages: pages.length,
      origin,
      blockedByRobots,
      sitemapCount: robotsData.sitemapUrls.length > 0 ? robotsData.sitemapUrls.length : sitemapPageUrls.length > 0 ? 1 : 0,
      seededFromSitemaps,
    },
    scores,
    metrics,
    linkGraph,
    summary,
    recommendations,
    siteIssues,
    pages,
  };
}
