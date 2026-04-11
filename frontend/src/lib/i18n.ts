export type Locale = "en" | "de";

type Dictionary = Record<string, { en: string; de: string }>;

const dictionary: Dictionary = {
  appSubtitle: {
    en: "API-first technical SEO and content analysis platform",
    de: "API-first Plattform für technische SEO- und Inhaltsanalyse",
  },
  uiLanguage: {
    en: "UI language",
    de: "UI-Sprache",
  },
  analyze: {
    en: "Analyze",
    de: "Analysieren",
  },
  analyzing: {
    en: "Analyzing...",
    de: "Analysiere...",
  },
  targetUrl: {
    en: "Target URL",
    de: "Ziel-URL",
  },
  advanced: {
    en: "Advanced",
    de: "Erweitert",
  },
  advancedSettings: {
    en: "Advanced settings",
    de: "Erweiterte Einstellungen",
  },
  analysisMode: {
    en: "Analysis mode",
    de: "Analysemodus",
  },
  modePage: {
    en: "Single page",
    de: "Einzelseite",
  },
  modeSite: {
    en: "Site crawl",
    de: "Website-Crawl",
  },
  maxPages: {
    en: "Max pages",
    de: "Maximale Seiten",
  },
  includePerformance: {
    en: "Include PageSpeed metrics",
    de: "PageSpeed-Metriken einbeziehen",
  },
  performanceStrategy: {
    en: "Performance strategy",
    de: "Performance-Strategie",
  },
  strategyMobile: {
    en: "Mobile",
    de: "Mobil",
  },
  strategyDesktop: {
    en: "Desktop",
    de: "Desktop",
  },
  responseLanguage: {
    en: "API response language",
    de: "API-Antwortsprache",
  },
  singlePageOnly: {
    en: "Only scan a single page",
    de: "Nur eine einzelne Seite scannen",
  },
  result: {
    en: "Result",
    de: "Ergebnis",
  },
  noResultHint: {
    en: "Run an analysis to view scores, recommendations, and checks.",
    de: "Starte eine Analyse, um Scores, Empfehlungen und Checks zu sehen.",
  },
  analysisSnapshot: {
    en: "Analysis snapshot",
    de: "Analyse-Snapshot",
  },
  qualityExcellent: {
    en: "Excellent quality",
    de: "Ausgezeichnete Qualität",
  },
  qualityGood: {
    en: "Good quality",
    de: "Gute Qualität",
  },
  qualityFair: {
    en: "Needs optimization",
    de: "Benötigt Optimierung",
  },
  qualityNeedsWork: {
    en: "Needs attention",
    de: "Benötigt Aufmerksamkeit",
  },
  qualityUnknown: {
    en: "No score available",
    de: "Kein Score verfügbar",
  },
  qualitySignalOverall: {
    en: "Overall score reflects technical and content health.",
    de: "Der Gesamtscore zeigt den technischen und inhaltlichen Zustand.",
  },
  qualitySignalContent: {
    en: "Sub-scores show where quality is uneven.",
    de: "Teil-Scores zeigen, wo die Qualität unausgewogen ist.",
  },
  qualitySignalActions: {
    en: "Prioritized actions define what to fix first.",
    de: "Priorisierte Maßnahmen zeigen, was zuerst verbessert werden sollte.",
  },
  siteCrawlOverview: {
    en: "Site crawl overview",
    de: "Website-Crawl-Übersicht",
  },
  sitewideFindings: {
    en: "Sitewide findings",
    de: "Website-weite Erkenntnisse",
  },
  pageExplorer: {
    en: "Page explorer",
    de: "Seiten-Explorer",
  },
  pageExplorerHint: {
    en: "Browse crawled pages and inspect one page in detail.",
    de: "Durchsuche gecrawlte Seiten und prüfe eine Seite im Detail.",
  },
  searchPages: {
    en: "Search pages...",
    de: "Seiten suchen...",
  },
  filterAll: {
    en: "All",
    de: "Alle",
  },
  filterIssues: {
    en: "Issues",
    de: "Probleme",
  },
  filterFailed: {
    en: "Failed",
    de: "Fehlgeschlagen",
  },
  detailOverview: {
    en: "Overview",
    de: "Überblick",
  },
  detailIssues: {
    en: "Issues",
    de: "Probleme",
  },
  detailStrengths: {
    en: "Strengths",
    de: "Stärken",
  },
  detailRecommendations: {
    en: "Recommendations",
    de: "Empfehlungen",
  },
  pagesWithIssues: {
    en: "Pages with issues",
    de: "Seiten mit Problemen",
  },
  duplicateTitleCount: {
    en: "Duplicate titles",
    de: "Doppelte Titel",
  },
  weaklyLinkedPages: {
    en: "Weakly linked pages",
    de: "Schwach verlinkte Seiten",
  },
  pagesWithBrokenInternalLinks: {
    en: "Pages with broken links",
    de: "Seiten mit defekten Links",
  },
  pagesWithoutMetaDescription: {
    en: "Pages without meta description",
    de: "Seiten ohne Meta-Beschreibung",
  },
  noPagesMatch: {
    en: "No pages match the current filters.",
    de: "Keine Seiten passen zu den aktuellen Filtern.",
  },
  showAffectedPages: {
    en: "Show affected pages",
    de: "Betroffene Seiten anzeigen",
  },
  selectPage: {
    en: "Select page",
    de: "Seite auswählen",
  },
  crawledPages: {
    en: "Crawled pages",
    de: "Gecrawlte Seiten",
  },
  analyzedPages: {
    en: "Analyzed pages",
    de: "Analysierte Seiten",
  },
  failedPages: {
    en: "Failed pages",
    de: "Fehlgeschlagene Seiten",
  },
  maxDepth: {
    en: "Max depth",
    de: "Maximale Tiefe",
  },
  pageStatusAnalyzed: {
    en: "Analyzed",
    de: "Analysiert",
  },
  pageStatusFailed: {
    en: "Failed",
    de: "Fehlgeschlagen",
  },
  depth: {
    en: "Depth",
    de: "Tiefe",
  },
  statusCode: {
    en: "Status code",
    de: "Statuscode",
  },
  wordCount: {
    en: "Word count",
    de: "Wortanzahl",
  },
  incomingLinks: {
    en: "Incoming links",
    de: "Eingehende Links",
  },
  outgoingLinks: {
    en: "Outgoing links",
    de: "Ausgehende Links",
  },
  brokenLinks: {
    en: "Broken links",
    de: "Defekte Links",
  },
  redirected: {
    en: "Redirected",
    de: "Weitergeleitet",
  },
  noindex: {
    en: "Noindex",
    de: "Noindex",
  },
  yes: {
    en: "Yes",
    de: "Ja",
  },
  no: {
    en: "No",
    de: "Nein",
  },
  pageError: {
    en: "Page error",
    de: "Seitenfehler",
  },
  pageIssues: {
    en: "Page issues",
    de: "Seitenprobleme",
  },
  pageStrengths: {
    en: "Page strengths",
    de: "Seitenstärken",
  },
  pageRecommendations: {
    en: "Page recommendations",
    de: "Seitenempfehlungen",
  },
  affectedPages: {
    en: "affected pages",
    de: "betroffene Seiten",
  },
  scores: {
    en: "Scores",
    de: "Scores",
  },
  summary: {
    en: "Summary",
    de: "Zusammenfassung",
  },
  strengths: {
    en: "Strengths",
    de: "Stärken",
  },
  issues: {
    en: "Issues",
    de: "Probleme",
  },
  recommendations: {
    en: "Recommendations",
    de: "Empfehlungen",
  },
  priorityHigh: {
    en: "High",
    de: "Hoch",
  },
  priorityMedium: {
    en: "Medium",
    de: "Mittel",
  },
  priorityLow: {
    en: "Low",
    de: "Niedrig",
  },
  general: {
    en: "General",
    de: "Allgemein",
  },
  noStrengths: {
    en: "No strengths detected in this run.",
    de: "In diesem Lauf wurden keine Stärken erkannt.",
  },
  noIssues: {
    en: "No issues were flagged in this run.",
    de: "In diesem Lauf wurden keine Probleme markiert.",
  },
  noRecommendations: {
    en: "No recommendations available.",
    de: "Keine Empfehlungen verfügbar.",
  },
  noChecks: {
    en: "No checks available.",
    de: "Keine Checks verfügbar.",
  },
  checks: {
    en: "Checks",
    de: "Checks",
  },
  siteIssues: {
    en: "Site issues",
    de: "Website-Probleme",
  },
  metrics: {
    en: "Metrics",
    de: "Metriken",
  },
  health: {
    en: "API ready",
    de: "API bereit",
  },
  credits: {
    en: "Built by Martin-Andree Herz",
    de: "Erstellt von Martin-Andree Herz",
  },
  githubRepository: {
    en: "GitHub repository",
    de: "GitHub-Repository",
  },
  requestFailed: {
    en: "Request failed with status",
    de: "Anfrage fehlgeschlagen mit Status",
  },
  unknownError: {
    en: "Unknown error",
    de: "Unbekannter Fehler",
  },
  overall: {
    en: "Overall",
    de: "Gesamt",
  },
  seo: {
    en: "SEO",
    de: "SEO",
  },
  content: {
    en: "Content",
    de: "Inhalt",
  },
  ux: {
    en: "UX",
    de: "UX",
  },
  notAvailable: {
    en: "n/a",
    de: "n/v",
  },
};

export function t(locale: Locale, key: keyof typeof dictionary): string {
  const entry = dictionary[key];
  if (!entry) {
    return String(key);
  }

  return entry[locale] ?? entry.en ?? String(key);
}
