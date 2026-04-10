import * as cheerio from "cheerio";

import { fetchTextResource } from "./fetchPage.js";

interface RobotsData {
  disallowRules: string[];
  sitemapUrls: string[];
}

function normalizePath(path: string): string {
  if (!path.startsWith("/")) {
    return `/${path}`;
  }

  return path;
}

export function parseRobotsTxt(content: string): RobotsData {
  const lines = content.split(/\r?\n/);
  const sitemapUrls: string[] = [];
  const disallowRules: string[] = [];
  let appliesToWildcard = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const [directiveRaw, ...valueParts] = line.split(":");
    const directive = directiveRaw?.trim().toLowerCase();
    const value = valueParts.join(":").trim();

    if (directive === "user-agent") {
      appliesToWildcard = value === "*";
      continue;
    }

    if (directive === "sitemap" && value) {
      sitemapUrls.push(value);
      continue;
    }

    if (directive === "disallow" && appliesToWildcard && value) {
      disallowRules.push(normalizePath(value));
    }
  }

  return {
    disallowRules,
    sitemapUrls,
  };
}

export function isAllowedByRobots(url: string, origin: string, disallowRules: string[]): boolean {
  try {
    const resolved = new URL(url, origin);
    const path = resolved.pathname || "/";

    return !disallowRules.some((rule) => rule !== "/" && path.startsWith(rule)) && !disallowRules.includes("/");
  } catch {
    return false;
  }
}

function extractUrlsFromXml(xml: string): string[] {
  const $ = cheerio.load(xml, { xmlMode: true });
  const locs = $("loc")
    .map((_index, element) => $(element).text().trim())
    .get()
    .filter(Boolean);

  return Array.from(new Set(locs));
}

export async function discoverRobots(origin: string): Promise<RobotsData> {
  try {
    const robotsUrl = new URL("/robots.txt", origin).toString();
    const response = await fetchTextResource(robotsUrl, {
      accept: "text/plain,text/*",
      requireOk: true,
    });

    return parseRobotsTxt(response.text);
  } catch {
    return {
      disallowRules: [],
      sitemapUrls: [],
    };
  }
}

export async function discoverSitemapUrls(origin: string, robotsData: RobotsData): Promise<string[]> {
  const candidates = robotsData.sitemapUrls.length > 0 ? robotsData.sitemapUrls : [new URL("/sitemap.xml", origin).toString()];
  const uniqueCandidates = Array.from(new Set(candidates));
  const discoveredPageUrls = new Set<string>();
  const queue = [...uniqueCandidates];
  const seenSitemaps = new Set<string>();

  while (queue.length > 0 && seenSitemaps.size < 5) {
    const sitemapUrl = queue.shift();

    if (!sitemapUrl || seenSitemaps.has(sitemapUrl)) {
      continue;
    }

    seenSitemaps.add(sitemapUrl);

    try {
      const response = await fetchTextResource(sitemapUrl, {
        accept: "application/xml,text/xml,text/plain,*/*",
        requireOk: true,
      });
      const urls = extractUrlsFromXml(response.text);

      for (const url of urls) {
        if (url.endsWith(".xml")) {
          queue.push(url);
        } else if (new URL(url).origin === origin) {
          discoveredPageUrls.add(url);
        }
      }
    } catch {
      continue;
    }
  }

  return Array.from(discoveredPageUrls);
}
