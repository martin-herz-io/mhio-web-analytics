import { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconClipboardCheck,
  IconInfoCircle,
  IconPointFilled,
  IconRoute,
  IconSearch,
  IconTargetArrow,
} from "@tabler/icons-react";

import { cn } from "../../lib/cn";
import { t } from "../../lib/i18n";

type LabelFn = (key: Parameters<typeof t>[1]) => string;

interface ScoreBreakdown {
  overall?: number;
  seo?: number;
  content?: number;
  ux?: number;
}

interface Summary {
  strengths?: string[];
  issues?: string[];
}

interface Recommendation {
  id: string;
  message: string;
  category?: string;
  priority?: string;
}

interface CheckResult {
  id: string;
  status: "good" | "warning" | "bad";
  message: string;
}

interface PageReport {
  summary?: Summary;
  checks?: CheckResult[];
  recommendations?: Recommendation[];
  scores?: ScoreBreakdown;
  metrics?: {
    wordCount?: number;
    internalLinkCount?: number;
    externalLinkCount?: number;
    brokenInternalLinkCount?: number;
  };
}

interface CrawledPageResult {
  url: string;
  depth: number;
  status: "analyzed" | "failed";
  report?: PageReport;
  pageMeta?: {
    title?: string;
    statusCode?: number;
    wasRedirected?: boolean;
    isNoindex?: boolean;
    wordCount?: number;
    brokenInternalLinkCount?: number;
    outgoingInternalUrls?: string[];
  };
  error?: string;
}

interface SiteIssue {
  id: string;
  message: string;
  severity?: "high" | "medium" | "low";
  affectedPages?: string[];
}

interface SiteMetrics {
  crawledPages?: number;
  analyzedPages?: number;
  failedPages?: number;
  maxDepthReached?: number;
  duplicateTitleCount?: number;
  weaklyLinkedPages?: number;
  pagesWithBrokenInternalLinks?: number;
  pagesWithoutMetaDescription?: number;
}

interface LinkGraphReport {
  nodes?: Array<{
    url: string;
    incomingInternalLinks: number;
    outgoingInternalLinks: number;
    depth: number;
  }>;
}

export interface AnalyzeResponse {
  scores?: ScoreBreakdown;
  summary?: Summary;
  recommendations?: Recommendation[];
  checks?: CheckResult[];
  siteIssues?: SiteIssue[];
  pages?: CrawledPageResult[];
  metrics?: SiteMetrics;
  linkGraph?: LinkGraphReport;
  crawl?: {
    origin?: string;
    blockedByRobots?: number;
    crawledPages?: number;
  };
}

interface AnalysisResultsProps {
  result: AnalyzeResponse;
  label: LabelFn;
}

type PageFilter = "all" | "issues" | "failed";
type PageDetailTab = "overview" | "issues" | "strengths" | "recommendations";

function normalizeScore(score: number | undefined): number | null {
  if (typeof score !== "number" || Number.isNaN(score)) {
    return null;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreDisplay(score: number | null, fallback: string): string {
  return score === null ? fallback : String(score);
}

function scoreTone(score: number | null) {
  if (score === null) {
    return {
      ring: "rgba(161,161,170,0.65)",
      text: "text-zinc-200",
      badge: "border-zinc-700 bg-zinc-800 text-zinc-200",
      qualityKey: "qualityUnknown" as const,
    };
  }

  if (score >= 85) {
    return {
      ring: "rgba(74,222,128,0.9)",
      text: "text-emerald-300",
      badge: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
      qualityKey: "qualityExcellent" as const,
    };
  }

  if (score >= 70) {
    return {
      ring: "rgba(110,231,183,0.85)",
      text: "text-emerald-200",
      badge: "border-emerald-400/20 bg-emerald-500/5 text-emerald-200",
      qualityKey: "qualityGood" as const,
    };
  }

  if (score >= 50) {
    return {
      ring: "rgba(250,204,21,0.85)",
      text: "text-amber-200",
      badge: "border-amber-400/30 bg-amber-500/10 text-amber-200",
      qualityKey: "qualityFair" as const,
    };
  }

  return {
    ring: "rgba(248,113,113,0.85)",
    text: "text-red-200",
    badge: "border-red-400/25 bg-red-500/10 text-red-200",
    qualityKey: "qualityNeedsWork" as const,
  };
}

function recommendationPriority(priority: string | undefined): "high" | "medium" | "low" {
  if (priority === "high" || priority === "medium" || priority === "low") {
    return priority;
  }
  return "medium";
}

function priorityStyles(priority: "high" | "medium" | "low") {
  if (priority === "high") {
    return {
      dot: "bg-red-300",
      badge: "border-red-400/30 bg-red-500/10 text-red-200",
      labelKey: "priorityHigh" as const,
    };
  }
  if (priority === "low") {
    return {
      dot: "bg-emerald-300",
      badge: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
      labelKey: "priorityLow" as const,
    };
  }
  return {
    dot: "bg-amber-300",
    badge: "border-amber-400/30 bg-amber-500/10 text-amber-200",
    labelKey: "priorityMedium" as const,
  };
}

function severityStyles(severity: SiteIssue["severity"]) {
  if (severity === "high") {
    return "border-red-500/30 bg-red-500/10 text-red-200";
  }
  if (severity === "low") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  }
  return "border-amber-500/30 bg-amber-500/10 text-amber-200";
}

function urlLabel(input: string): string {
  try {
    const parsed = new URL(input);
    return parsed.pathname === "/" ? parsed.hostname : `${parsed.hostname}${parsed.pathname}`;
  } catch {
    return input;
  }
}

function getPageIssueCount(page: CrawledPageResult): number {
  if (page.status === "failed") {
    return 1;
  }

  return page.report?.summary?.issues?.length || 0;
}

export function AnalysisResults({ result, label }: AnalysisResultsProps) {
  const overallScore = normalizeScore(result.scores?.overall);
  const seoScore = normalizeScore(result.scores?.seo);
  const contentScore = normalizeScore(result.scores?.content);
  const uxScore = normalizeScore(result.scores?.ux);
  const overallTone = scoreTone(overallScore);
  const progressDegrees = overallScore === null ? 0 : (overallScore / 100) * 360;
  const strengths = (result.summary?.strengths || []).slice(0, 6);
  const issues = (result.summary?.issues || []).slice(0, 6);
  const recommendations = (result.recommendations || []).slice(0, 8);
  const checks = (result.checks || []).slice(0, 10);
  const pages = result.pages || [];
  const isSiteReport = pages.length > 0;
  const [selectedPageUrl, setSelectedPageUrl] = useState<string>("");
  const [pageQuery, setPageQuery] = useState("");
  const [pageFilter, setPageFilter] = useState<PageFilter>("all");
  const [pageDetailTab, setPageDetailTab] = useState<PageDetailTab>("overview");
  const deferredPageQuery = useDeferredValue(pageQuery);

  useEffect(() => {
    if (pages.length === 0) {
      setSelectedPageUrl("");
      return;
    }

    setSelectedPageUrl((current) => (current && pages.some((page) => page.url === current) ? current : pages[0].url));
  }, [pages]);

  const selectedPage = useMemo(
    () => pages.find((page) => page.url === selectedPageUrl) || pages[0],
    [pages, selectedPageUrl],
  );

  const selectedNode = useMemo(
    () => result.linkGraph?.nodes?.find((node) => node.url === selectedPage?.url),
    [result.linkGraph?.nodes, selectedPage?.url],
  );

  const filteredPages = useMemo(() => {
    return pages.filter((page) => {
      if (pageFilter === "failed" && page.status !== "failed") {
        return false;
      }

      if (pageFilter === "issues" && getPageIssueCount(page) === 0) {
        return false;
      }

      if (!deferredPageQuery.trim()) {
        return true;
      }

      const haystack = `${page.pageMeta?.title || ""} ${page.url}`.toLowerCase();
      return haystack.includes(deferredPageQuery.trim().toLowerCase());
    });
  }, [pages, pageFilter, deferredPageQuery]);

  useEffect(() => {
    if (filteredPages.length === 0) {
      return;
    }

    if (!filteredPages.some((page) => page.url === selectedPageUrl)) {
      setSelectedPageUrl(filteredPages[0].url);
    }
  }, [filteredPages, selectedPageUrl]);

  const analyzedPages = result.metrics?.analyzedPages ?? pages.filter((page) => page.status === "analyzed").length;
  const failedPages = result.metrics?.failedPages ?? pages.filter((page) => page.status === "failed").length;
  const crawledPages = result.metrics?.crawledPages ?? result.crawl?.crawledPages ?? pages.length;
  const pagesWithIssues = pages.filter((page) => getPageIssueCount(page) > 0).length;

  const scoreCards = [
    { key: "seo" as const, value: seoScore },
    { key: "content" as const, value: contentScore },
    { key: "ux" as const, value: uxScore },
  ];

  return (
    <div className="result-fade-in mt-4 space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/85 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_10px_30px_rgba(0,0,0,0.24)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(244,244,245,0.08),transparent_55%)]" />

        <div className="relative grid gap-6 md:grid-cols-[260px_1fr]">
          <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/75 px-4 py-5">
            <div className="relative h-40 w-40">
              <div
                className="absolute inset-0 rounded-full transition-[background] duration-700"
                style={{
                  background: `conic-gradient(${overallTone.ring} ${progressDegrees}deg, rgba(63,63,70,0.55) ${progressDegrees}deg 360deg)`,
                }}
                aria-hidden="true"
              />
              <div className="absolute inset-[10px] rounded-full border border-zinc-800 bg-zinc-950/95" aria-hidden="true" />
              <div className="relative z-10 flex h-full flex-col items-center justify-center">
                <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">{label("overall")}</span>
                <span className={cn("mt-1 text-5xl font-semibold leading-none", overallTone.text)}>
                  {scoreDisplay(overallScore, label("notAvailable"))}
                </span>
              </div>
            </div>
            <span className={cn("mt-4 inline-flex rounded-full border px-3 py-1 text-xs font-medium", overallTone.badge)}>
              {label(overallTone.qualityKey)}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">{label("analysisSnapshot")}</p>
              <h3 className="mt-1 text-lg font-semibold text-zinc-100">{label("result")} v2</h3>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {scoreCards.map((item) => {
                const value = item.value;
                const width = value === null ? 0 : value;
                return (
                  <article
                    key={item.key}
                    className="group rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-700 hover:bg-zinc-900/90"
                  >
                    <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{label(item.key)}</p>
                    <p className="mt-1 text-2xl font-semibold text-zinc-100">{scoreDisplay(value, label("notAvailable"))}</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-zinc-300/80 transition-[width] duration-700"
                        style={{ width: `${width}%` }}
                        aria-hidden="true"
                      />
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="grid gap-2 text-xs text-zinc-400 sm:grid-cols-3">
              <p className="rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2">{label("qualitySignalOverall")}</p>
              <p className="rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2">{label("qualitySignalContent")}</p>
              <p className="rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2">{label("qualitySignalActions")}</p>
            </div>
          </div>
        </div>
      </section>

      {isSiteReport ? (
        <>
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
            <header className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-zinc-100">
              <IconRoute size={16} className="text-zinc-400" />
              {label("siteCrawlOverview")}
            </header>
            <div className="grid gap-3 lg:grid-cols-5">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                <p className="text-xs uppercase tracking-wide text-zinc-500">{label("crawledPages")}</p>
                <p className="mt-1 text-2xl font-semibold text-zinc-100">{crawledPages}</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                <p className="text-xs uppercase tracking-wide text-zinc-500">{label("analyzedPages")}</p>
                <p className="mt-1 text-2xl font-semibold text-zinc-100">{analyzedPages}</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                <p className="text-xs uppercase tracking-wide text-zinc-500">{label("pagesWithIssues")}</p>
                <p className="mt-1 text-2xl font-semibold text-zinc-100">{pagesWithIssues}</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                <p className="text-xs uppercase tracking-wide text-zinc-500">{label("failedPages")}</p>
                <p className="mt-1 text-2xl font-semibold text-zinc-100">{failedPages}</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                <p className="text-xs uppercase tracking-wide text-zinc-500">{label("maxDepth")}</p>
                <p className="mt-1 text-2xl font-semibold text-zinc-100">{result.metrics?.maxDepthReached ?? 0}</p>
              </div>
            </div>
            <div className="mt-3 grid gap-2 text-xs text-zinc-300 sm:grid-cols-2 lg:grid-cols-4">
              <p className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
                {label("duplicateTitleCount")}: <span className="text-zinc-100">{result.metrics?.duplicateTitleCount ?? 0}</span>
              </p>
              <p className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
                {label("weaklyLinkedPages")}: <span className="text-zinc-100">{result.metrics?.weaklyLinkedPages ?? 0}</span>
              </p>
              <p className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
                {label("pagesWithBrokenInternalLinks")}:{" "}
                <span className="text-zinc-100">{result.metrics?.pagesWithBrokenInternalLinks ?? 0}</span>
              </p>
              <p className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
                {label("pagesWithoutMetaDescription")}:{" "}
                <span className="text-zinc-100">{result.metrics?.pagesWithoutMetaDescription ?? 0}</span>
              </p>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-[360px_1fr]">
            <aside className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
              <header className="mb-3">
                <h3 className="text-sm font-medium text-zinc-100">{label("pageExplorer")}</h3>
                <p className="mt-1 text-xs text-zinc-500">{label("pageExplorerHint")}</p>
              </header>

              <div className="relative mb-3">
                <IconSearch size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={pageQuery}
                  onChange={(event) => setPageQuery(event.target.value)}
                  placeholder={label("searchPages")}
                  className="h-9 w-full rounded-lg border border-zinc-800 bg-zinc-900 pl-9 pr-3 text-sm text-zinc-100 outline-none transition-colors focus-visible:border-zinc-600"
                />
              </div>

              <div className="mb-3 grid grid-cols-3 gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1">
                {(["all", "issues", "failed"] as const).map((filter) => {
                  const count =
                    filter === "all"
                      ? pages.length
                      : filter === "issues"
                        ? pages.filter((page) => getPageIssueCount(page) > 0).length
                        : pages.filter((page) => page.status === "failed").length;
                  const active = pageFilter === filter;
                  return (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setPageFilter(filter)}
                      className={cn(
                        "inline-flex cursor-pointer items-center justify-center rounded-md px-2 py-1.5 text-xs transition-colors",
                        active ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-200",
                      )}
                    >
                      {label(filter === "all" ? "filterAll" : filter === "issues" ? "filterIssues" : "filterFailed")} ({count})
                    </button>
                  );
                })}
              </div>

              <div className="max-h-[420px] space-y-2 overflow-auto pr-1">
                {filteredPages.length > 0 ? (
                  filteredPages.map((page) => {
                    const active = selectedPage?.url === page.url;
                    const issueCount = getPageIssueCount(page);
                    return (
                      <button
                        key={page.url}
                        type="button"
                        onClick={() => {
                          startTransition(() => {
                            setSelectedPageUrl(page.url);
                          });
                        }}
                        className={cn(
                          "w-full cursor-pointer rounded-xl border p-3 text-left transition-colors",
                          active
                            ? "border-zinc-600 bg-zinc-800/80"
                            : "border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-900/90",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="line-clamp-1 text-sm font-medium text-zinc-200">{page.pageMeta?.title || urlLabel(page.url)}</p>
                          <span
                            className={cn(
                              "mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full",
                              page.status === "analyzed" ? "bg-emerald-300" : "bg-red-300",
                            )}
                          />
                        </div>
                        <p className="mt-1 line-clamp-1 text-xs text-zinc-500">{urlLabel(page.url)}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                          <span className="rounded-md border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-zinc-300">
                            {label("depth")}: {page.depth}
                          </span>
                          <span
                            className={cn(
                              "rounded-md border px-1.5 py-0.5",
                              issueCount > 0
                                ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
                            )}
                          >
                            {label("issues")}: {issueCount}
                          </span>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <p className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-500">{label("noPagesMatch")}</p>
                )}
              </div>
            </aside>

            <article className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
              {selectedPage ? (
                <>
                  <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="truncate text-sm font-medium text-zinc-100">{selectedPage.pageMeta?.title || urlLabel(selectedPage.url)}</h4>
                      <p className="truncate text-xs text-zinc-500">{selectedPage.url}</p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs",
                        selectedPage.status === "analyzed"
                          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
                          : "border-red-500/25 bg-red-500/10 text-red-200",
                      )}
                    >
                      {selectedPage.status === "analyzed" ? label("pageStatusAnalyzed") : label("pageStatusFailed")}
                    </span>
                  </header>

                  <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1 md:grid-cols-4">
                    {(["overview", "issues", "strengths", "recommendations"] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setPageDetailTab(tab)}
                        className={cn(
                          "inline-flex cursor-pointer items-center justify-center rounded-md px-2 py-1.5 text-xs transition-colors",
                          pageDetailTab === tab ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-200",
                        )}
                      >
                        {label(
                          tab === "overview"
                            ? "detailOverview"
                            : tab === "issues"
                              ? "detailIssues"
                              : tab === "strengths"
                                ? "detailStrengths"
                                : "detailRecommendations",
                        )}
                      </button>
                    ))}
                  </div>

                  {pageDetailTab === "overview" ? (
                    <div className="grid gap-2 text-xs text-zinc-300 sm:grid-cols-2 lg:grid-cols-4">
                      <p className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
                        {label("depth")}: <span className="font-medium text-zinc-100">{selectedPage.depth}</span>
                      </p>
                      <p className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
                        {label("statusCode")}: <span className="font-medium text-zinc-100">{selectedPage.pageMeta?.statusCode ?? "-"}</span>
                      </p>
                      <p className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
                        {label("wordCount")}:{" "}
                        <span className="font-medium text-zinc-100">
                          {selectedPage.pageMeta?.wordCount ?? selectedPage.report?.metrics?.wordCount ?? "-"}
                        </span>
                      </p>
                      <p className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
                        {label("incomingLinks")}: <span className="font-medium text-zinc-100">{selectedNode?.incomingInternalLinks ?? "-"}</span>
                      </p>
                      <p className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
                        {label("outgoingLinks")}:{" "}
                        <span className="font-medium text-zinc-100">
                          {selectedNode?.outgoingInternalLinks ?? selectedPage.pageMeta?.outgoingInternalUrls?.length ?? "-"}
                        </span>
                      </p>
                      <p className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
                        {label("brokenLinks")}:{" "}
                        <span className="font-medium text-zinc-100">
                          {selectedPage.pageMeta?.brokenInternalLinkCount ?? selectedPage.report?.metrics?.brokenInternalLinkCount ?? 0}
                        </span>
                      </p>
                      <p className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
                        {label("redirected")}:{" "}
                        <span className="font-medium text-zinc-100">{selectedPage.pageMeta?.wasRedirected ? label("yes") : label("no")}</span>
                      </p>
                      <p className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
                        {label("noindex")}:{" "}
                        <span className="font-medium text-zinc-100">{selectedPage.pageMeta?.isNoindex ? label("yes") : label("no")}</span>
                      </p>
                    </div>
                  ) : null}

                  {pageDetailTab === "issues" ? (
                    selectedPage.status === "failed" ? (
                      <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                        {label("pageError")}: {selectedPage.error || label("unknownError")}
                      </p>
                    ) : (
                      <ul className="space-y-2">
                        {(selectedPage.report?.summary?.issues || []).slice(0, 10).map((item) => (
                          <li key={item} className="flex items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
                            <IconPointFilled size={14} className="mt-1 shrink-0 text-amber-300/80" />
                            <span>{item}</span>
                          </li>
                        ))}
                        {(selectedPage.report?.summary?.issues || []).length === 0 ? (
                          <li className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-500">{label("noIssues")}</li>
                        ) : null}
                      </ul>
                    )
                  ) : null}

                  {pageDetailTab === "strengths" ? (
                    <ul className="space-y-2">
                      {(selectedPage.report?.summary?.strengths || []).slice(0, 10).map((item) => (
                        <li key={item} className="flex items-start gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
                          <IconPointFilled size={14} className="mt-1 shrink-0 text-emerald-300/80" />
                          <span>{item}</span>
                        </li>
                      ))}
                      {(selectedPage.report?.summary?.strengths || []).length === 0 ? (
                        <li className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-500">{label("noStrengths")}</li>
                      ) : null}
                    </ul>
                  ) : null}

                  {pageDetailTab === "recommendations" ? (
                    <ul className="space-y-2">
                      {(selectedPage.report?.recommendations || []).slice(0, 8).map((item) => {
                        const priority = recommendationPriority(item.priority);
                        const styles = priorityStyles(priority);
                        return (
                          <li key={item.id} className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300">
                            <div className="mb-1 flex items-center gap-2">
                              <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", styles.badge)}>
                                <span className={cn("mr-1.5 inline-block h-1.5 w-1.5 rounded-full", styles.dot)} />
                                {label(styles.labelKey)}
                              </span>
                              <span className="inline-flex rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-300">
                                {item.category || label("general")}
                              </span>
                            </div>
                            <p>{item.message}</p>
                          </li>
                        );
                      })}
                      {(selectedPage.report?.recommendations || []).length === 0 ? (
                        <li className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-500">{label("noRecommendations")}</li>
                      ) : null}
                    </ul>
                  ) : null}
                </>
              ) : (
                <p className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-500">{label("noPagesMatch")}</p>
              )}
            </article>
          </section>

          {(result.siteIssues || []).length > 0 ? (
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
              <header className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-zinc-100">
                <IconInfoCircle size={16} className="text-zinc-400" />
                {label("sitewideFindings")}
              </header>
              <div className="space-y-2">
                {(result.siteIssues || []).map((item) => (
                  <article key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-zinc-200">{item.message}</p>
                      <span className={cn("shrink-0 rounded-full border px-2 py-0.5 text-[11px]", severityStyles(item.severity))}>
                        {label(item.severity === "high" ? "priorityHigh" : item.severity === "low" ? "priorityLow" : "priorityMedium")}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {(item.affectedPages || []).length} {label("affectedPages")}
                    </p>
                    {(item.affectedPages || []).length > 0 ? (
                      <details className="mt-2 rounded-lg border border-zinc-800 bg-zinc-900/80 p-2">
                        <summary className="cursor-pointer text-xs text-zinc-400">{label("showAffectedPages")}</summary>
                        <ul className="mt-2 space-y-1 text-xs text-zinc-500">
                          {(item.affectedPages || []).slice(0, 12).map((affectedPage) => (
                            <li key={affectedPage} className="truncate">
                              {urlLabel(affectedPage)}
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-emerald-600/20 bg-zinc-900/80 p-4 transition-colors hover:border-emerald-500/30">
              <header className="mb-3 flex items-center justify-between">
                <h3 className="inline-flex items-center gap-2 text-sm font-medium text-zinc-100">
                  <IconCircleCheck size={16} className="text-emerald-300" />
                  {label("strengths")}
                </h3>
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-200">
                  {strengths.length}
                </span>
              </header>
              {strengths.length > 0 ? (
                <ul className="space-y-2">
                  {strengths.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-zinc-300">
                      <IconPointFilled size={14} className="mt-1 shrink-0 text-emerald-300/80" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-500">{label("noStrengths")}</p>
              )}
            </article>

            <article className="rounded-2xl border border-amber-600/25 bg-zinc-900/80 p-4 transition-colors hover:border-amber-500/35">
              <header className="mb-3 flex items-center justify-between">
                <h3 className="inline-flex items-center gap-2 text-sm font-medium text-zinc-100">
                  <IconAlertTriangle size={16} className="text-amber-300" />
                  {label("issues")}
                </h3>
                <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200">
                  {issues.length}
                </span>
              </header>
              {issues.length > 0 ? (
                <ul className="space-y-2">
                  {issues.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-zinc-300">
                      <IconPointFilled size={14} className="mt-1 shrink-0 text-amber-300/80" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-500">{label("noIssues")}</p>
              )}
            </article>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
            <header className="mb-3 flex items-center justify-between">
              <h3 className="inline-flex items-center gap-2 text-sm font-medium text-zinc-100">
                <IconTargetArrow size={16} className="text-zinc-300" />
                {label("recommendations")}
              </h3>
              <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300">
                {recommendations.length}
              </span>
            </header>

            {recommendations.length > 0 ? (
              <div className="grid gap-2">
                {recommendations.map((item, index) => {
                  const priority = recommendationPriority(item.priority);
                  const styles = priorityStyles(priority);
                  const category = item.category || label("general");

                  return (
                    <article
                      key={item.id}
                      className="group rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-3 transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-900/90"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="text-xs text-zinc-500">#{index + 1}</span>
                            <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", styles.badge)}>
                              <span className={cn("mr-1.5 inline-block h-1.5 w-1.5 rounded-full", styles.dot)} />
                              {label(styles.labelKey)}
                            </span>
                            <span className="inline-flex rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[11px] text-zinc-300">
                              {category}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-200">{item.message}</p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">{label("noRecommendations")}</p>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
            <h3 className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-zinc-100">
              <IconClipboardCheck size={16} className="text-zinc-400" />
              {label("checks")}
            </h3>
            {checks.length > 0 ? (
              <ul className="grid gap-2 md:grid-cols-2">
                {checks.map((item) => (
                  <li key={item.id} className="rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-sm text-zinc-300">
                    <span
                      className={cn(
                        "mr-2 inline-block h-1.5 w-1.5 rounded-full align-middle",
                        item.status === "good" ? "bg-emerald-300" : item.status === "warning" ? "bg-amber-300" : "bg-red-300",
                      )}
                    />
                    <span className="align-middle">{item.message}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-500">{label("noChecks")}</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export function AnalysisResultsSkeleton({ label }: { label: LabelFn }) {
  return (
    <div className="mt-4 space-y-5" aria-live="polite" aria-busy="true">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5">
        <div className="grid gap-4 md:grid-cols-[240px_1fr]">
          <div className="flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
            <div className="h-36 w-36 animate-pulse rounded-full border border-zinc-700 bg-zinc-900" />
          </div>
          <div className="space-y-3">
            <div className="h-4 w-48 animate-pulse rounded bg-zinc-800" />
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="h-20 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />
              <div className="h-20 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />
              <div className="h-20 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900" />
            </div>
          </div>
        </div>
      </section>
      <p className="text-sm text-zinc-500">{label("analyzing")}</p>
    </div>
  );
}
