import "dotenv/config";

const performanceStrategies = ["mobile", "desktop"] as const;
const brokenLinkCheckMethods = ["HEAD", "GET"] as const;
const locales = ["en", "de"] as const;

function readString(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : fallback;
}

function readOptionalString(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : undefined;
}

function readNumber(name: string, fallback: number): number {
  const value = process.env[name];

  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readBoolean(name: string, fallback: boolean): boolean {
  const value = process.env[name];

  if (!value) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

function readEnum<T extends readonly string[]>(name: string, allowedValues: T, fallback: T[number]): T[number] {
  const value = process.env[name];

  if (!value) {
    return fallback;
  }

  const normalized = value.trim();
  return allowedValues.includes(normalized as T[number]) ? (normalized as T[number]) : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export const appConfig = {
  server: {
    host: readString("HOST", "0.0.0.0"),
    port: readNumber("PORT", 3000),
    nodeEnv: readString("NODE_ENV", "development"),
  },
  http: {
    userAgent: readString("MHIO_HTTP_USER_AGENT", "mhio-web-analytics/0.0.1 (+https://github.com/)"),
    requestTimeoutMs: clamp(readNumber("MHIO_HTTP_TIMEOUT_MS", 10000), 1000, 120000),
  },
  crawler: {
    defaultMaxPages: clamp(readNumber("MHIO_CRAWLER_DEFAULT_MAX_PAGES", 10), 1, 1000),
    hardMaxPages: clamp(readNumber("MHIO_CRAWLER_HARD_MAX_PAGES", 50), 1, 5000),
    concurrency: clamp(readNumber("MHIO_CRAWLER_CONCURRENCY", 3), 1, 20),
    brokenLinkCheckMethod: readEnum("MHIO_BROKEN_LINK_CHECK_METHOD", brokenLinkCheckMethods, "HEAD"),
    followRedirects: readBoolean("MHIO_HTTP_FOLLOW_REDIRECTS", true),
  },
  performance: {
    defaultEnabled: readBoolean("MHIO_PAGESPEED_DEFAULT_ENABLED", false),
    strategy: readEnum("MHIO_PAGESPEED_STRATEGY", performanceStrategies, "mobile"),
    apiKey: readOptionalString("PAGESPEED_API_KEY"),
    timeoutMs: clamp(readNumber("MHIO_PAGESPEED_TIMEOUT_MS", 20000), 1000, 120000),
  },
  docs: {
    enabled: readBoolean("MHIO_DOCS_ENABLED", true),
  },
  i18n: {
    defaultLocale: readEnum("MHIO_DEFAULT_LOCALE", locales, "en"),
  },
} as const;
