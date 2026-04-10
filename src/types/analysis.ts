export type CheckCategory = "seo" | "content" | "ux";
export type CheckStatus = "good" | "warning" | "bad";

export interface PageHeading {
  level: number;
  text: string;
}

export interface PageImage {
  src: string;
  alt: string;
}

export interface PageLink {
  href: string;
  text: string;
  isInternal: boolean;
  resolvedUrl?: string;
}

export interface PageData {
  url: string;
  requestedUrl: string;
  title: string;
  metaDescription: string;
  canonical: string;
  lang: string;
  ogTitle: string;
  ogDescription: string;
  metaRobots: string;
  xRobotsTag: string;
  isNoindex: boolean;
  hreflangLinks: Array<{
    hreflang: string;
    href: string;
  }>;
  structuredDataTypes: string[];
  structuredDataValidations: StructuredDataValidation[];
  bodyText: string;
  wordCount: number;
  sentenceCount: number;
  mainContentWordCount: number;
  boilerplateWordCount: number;
  paragraphs: string[];
  headings: PageHeading[];
  images: PageImage[];
  links: PageLink[];
  internalLinks: number;
  externalLinks: number;
  buttonCount: number;
  listCount: number;
  brokenInternalLinkCount: number;
  statusCode: number;
  wasRedirected: boolean;
  redirectCount: number;
}

export interface StructuredDataValidation {
  type: string;
  isValid: boolean;
  missingFields: string[];
}

export interface AnalysisCheck {
  id: string;
  category: CheckCategory;
  status: CheckStatus;
  score: number;
  maxScore: number;
  message: string;
  details: Record<string, unknown>;
}

export interface ScoreBreakdown {
  overall: number;
  seo: number;
  content: number;
  ux: number;
}

export interface ReportSummary {
  strengths: string[];
  issues: string[];
}

export interface Recommendation {
  id: string;
  category: CheckCategory;
  priority: "high" | "medium" | "low";
  message: string;
}

export interface AnalysisMetrics {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  headingCount: number;
  imageCount: number;
  linkCount: number;
  internalLinkCount: number;
  externalLinkCount: number;
  buttonCount: number;
  listCount: number;
  brokenInternalLinkCount: number;
  hreflangCount: number;
  structuredDataTypeCount: number;
  validStructuredDataCount: number;
  invalidStructuredDataCount: number;
  isNoindex: boolean;
  hasXRobotsTag: boolean;
}

export interface AnalysisReport {
  url: string;
  fetchedUrl: string;
  analyzedAt: string;
  scores: ScoreBreakdown;
  metrics: AnalysisMetrics;
  summary: ReportSummary;
  recommendations: Recommendation[];
  checks: AnalysisCheck[];
  performance: PerformanceReport | null;
}

export interface CrawlRequest {
  url: string;
  maxPages?: number;
  includePerformance?: boolean;
  performanceStrategy?: PerformanceStrategy;
}

export interface CrawledPageResult {
  url: string;
  depth: number;
  status: "analyzed" | "failed";
  report?: AnalysisReport;
  pageMeta?: {
    title: string;
    metaDescription: string;
    canonical: string;
    canonicalTarget: string;
    requestedUrl: string;
    fetchedUrl: string;
    isNoindex: boolean;
    xRobotsTag: string;
    statusCode: number;
    wasRedirected: boolean;
    brokenInternalLinkCount: number;
    hreflangCount: number;
    structuredDataTypeCount: number;
    invalidStructuredDataCount: number;
    wordCount: number;
    contentFingerprint: string;
    outgoingInternalUrls: string[];
    hreflangValues: string[];
    hreflangTargets: string[];
    mainContentWordCount: number;
    boilerplateWordCount: number;
  };
  error?: string;
}

export interface SiteMetrics {
  crawledPages: number;
  analyzedPages: number;
  failedPages: number;
  averageWordCount: number;
  averageScore: number;
  averagePerformanceScore: number | null;
  pagesWithPerformanceData: number;
  duplicateTitleCount: number;
  duplicateMetaDescriptionCount: number;
  duplicateContentGroups: number;
  thinContentPages: number;
  canonicalClusterCount: number;
  hreflangInconsistencyPages: number;
  pagesWithLowMainContentShare: number;
  pagesWithoutIncomingInternalLinks: number;
  weaklyLinkedPages: number;
  pagesWithoutH1: number;
  pagesWithoutMetaDescription: number;
  pagesWithLongParagraphIssues: number;
  pagesWithoutCanonical: number;
  noindexPages: number;
  xRobotsTagPages: number;
  hreflangPages: number;
  structuredDataPages: number;
  pagesWithInvalidStructuredData: number;
  redirectedPages: number;
  canonicalConflictPages: number;
  pagesWithBrokenInternalLinks: number;
  maxDepthReached: number;
}

export interface SiteIssue {
  id: string;
  severity: "high" | "medium" | "low";
  message: string;
  affectedPages: string[];
}

export interface SiteAnalysisReport {
  url: string;
  analyzedAt: string;
  crawl: {
    maxPages: number;
    crawledPages: number;
    origin: string;
    blockedByRobots: number;
    sitemapCount: number;
    seededFromSitemaps: number;
  };
  scores: ScoreBreakdown;
  metrics: SiteMetrics;
  linkGraph: LinkGraphReport;
  summary: ReportSummary;
  recommendations: Recommendation[];
  siteIssues: SiteIssue[];
  pages: CrawledPageResult[];
}

export type PerformanceStrategy = "mobile" | "desktop";

export interface PerformanceMetric {
  id: string;
  title: string;
  displayValue: string;
  numericValue?: number;
}

export interface PerformanceReport {
  provider: "pagespeed-insights";
  status: "available" | "unavailable" | "error";
  strategy: PerformanceStrategy;
  score: number | null;
  metrics: PerformanceMetric[];
  fetchedAt: string;
  message?: string;
}

export interface LinkGraphNode {
  url: string;
  incomingInternalLinks: number;
  outgoingInternalLinks: number;
  depth: number;
}

export interface LinkGraphReport {
  nodes: LinkGraphNode[];
  edgeCount: number;
  pagesWithoutIncomingInternalLinks: string[];
  weaklyLinkedPages: string[];
  deepestPages: string[];
}
