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
  return dictionary[key][locale];
}
