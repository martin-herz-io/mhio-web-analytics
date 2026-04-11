import * as cheerio from "cheerio";
import type { Element } from "domhandler";

import type { PageData, PageLink, StructuredDataValidation } from "../types/analysis.js";

interface CollectPageDataOptions {
  requestedUrl?: string;
  statusCode?: number;
  wasRedirected?: boolean;
  redirectCount?: number;
  xRobotsTag?: string;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function extractTextFromElement($: cheerio.CheerioAPI, element: Element): string {
  return normalizeText($(element).text());
}

function parseLinks($: cheerio.CheerioAPI, links: Element[], baseUrl: string): PageLink[] {
  const origin = new URL(baseUrl).origin;

  return links.map((element) => {
    const href = element.attribs.href?.trim() || "";
    const text = extractTextFromElement($, element);

    let isInternal = false;

    try {
      if (href) {
        const resolved = new URL(href, baseUrl);
        isInternal = resolved.origin === origin;
        return {
          href,
          text,
          isInternal,
          resolvedUrl: resolved.toString(),
        };
      }
    } catch {
      isInternal = false;
    }

    return {
      href,
      text,
      isInternal,
    };
  });
}

function countSentences(text: string): number {
  const matches = text.match(/[^.!?]+[.!?]+/g);
  return matches?.length || (text.length > 0 ? 1 : 0);
}

function countWords(text: string): number {
  return text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
}

const STRUCTURED_DATA_REQUIRED_FIELDS: Record<string, string[]> = {
  Organization: ["name"],
  LocalBusiness: ["name", "address"],
  WebSite: ["name", "url"],
  Article: ["headline", "author", "datePublished"],
  BlogPosting: ["headline", "author", "datePublished"],
  Product: ["name"],
  FAQPage: ["mainEntity"],
  BreadcrumbList: ["itemListElement"],
  ContactPage: ["name"],
};

function normalizeStructuredType(type: string): string {
  return type.trim();
}

function extractStructuredData($: cheerio.CheerioAPI): {
  types: string[];
  validations: StructuredDataValidation[];
} {
  const discoveredTypes = new Set<string>();
  const validations: StructuredDataValidation[] = [];

  $("script[type='application/ld+json']").each((_index, element) => {
    const raw = $(element).text().trim();

    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      const queue = Array.isArray(parsed) ? [...parsed] : [parsed];

      while (queue.length > 0) {
        const current = queue.shift();

        if (!current || typeof current !== "object") {
          continue;
        }

        const maybeType = (current as { "@type"?: unknown })["@type"];

        const normalizedTypes: string[] =
          typeof maybeType === "string"
            ? [normalizeStructuredType(maybeType)]
            : Array.isArray(maybeType)
              ? maybeType.filter((entry): entry is string => typeof entry === "string").map(normalizeStructuredType)
              : [];

        for (const type of normalizedTypes) {
          if (type) {
            discoveredTypes.add(type);
          }
        }

        for (const type of normalizedTypes) {
          const requiredFields = STRUCTURED_DATA_REQUIRED_FIELDS[type];

          if (!requiredFields) {
            continue;
          }

          const missingFields = requiredFields.filter((field) => {
            const value = (current as Record<string, unknown>)[field];

            if (typeof value === "string") {
              return value.trim().length === 0;
            }

            if (Array.isArray(value)) {
              return value.length === 0;
            }

            return value === undefined || value === null;
          });

          validations.push({
            type,
            isValid: missingFields.length === 0,
            missingFields,
          });
        }

        for (const value of Object.values(current)) {
          if (Array.isArray(value)) {
            queue.push(...value);
          } else if (value && typeof value === "object") {
            queue.push(value);
          }
        }
      }
    } catch {
      return;
    }
  });

  return {
    types: Array.from(discoveredTypes),
    validations,
  };
}

export function collectPageData(html: string, url: string): PageData {
  return collectPageDataWithOptions(html, url, {});
}

export function collectPageDataWithOptions(html: string, url: string, options: CollectPageDataOptions): PageData {
  const $ = cheerio.load(html);
  const bodyText = normalizeText($("body").text());
  const mainText = normalizeText($("main").first().text());
  const headerText = normalizeText($("header").text());
  const navText = normalizeText($("nav").text());
  const footerText = normalizeText($("footer").text());
  const normalizedMetaRobots = normalizeText($('meta[name="robots"]').attr("content") || "");
  const normalizedXRobotsTag = normalizeText(options.xRobotsTag || "");
  const paragraphs = $("p")
    .map((_index, element) => extractTextFromElement($, element))
    .get()
    .filter(Boolean);
  const headings = $("h1, h2, h3, h4, h5, h6")
    .map((_index, element) => ({
      level: Number(element.tagName.slice(1)),
      text: extractTextFromElement($, element),
    }))
    .get()
    .filter((heading) => heading.text.length > 0);
  const images = $("img")
    .map((_index, element) => ({
      src: element.attribs.src || "",
      alt: normalizeText(element.attribs.alt || ""),
    }))
    .get();
  const links = parseLinks($, $("a[href]").get(), url);
  const wordCount = bodyText.length === 0 ? 0 : bodyText.split(/\s+/).length;
  const sentenceCount = countSentences(bodyText);
  const mainContentWordCount = mainText ? countWords(mainText) : Math.max(wordCount - countWords(`${headerText} ${navText} ${footerText}`), 0);
  const boilerplateWordCount = countWords(`${headerText} ${navText} ${footerText}`);
  const internalLinks = links.filter((link) => link.isInternal).length;
  const externalLinks = links.filter((link) => !link.isInternal).length;
  const buttonCount = $("button, a[role='button'], input[type='submit']").length;
  const listCount = $("ul, ol").length;
  const hreflangLinks = $("link[rel='alternate'][hreflang]")
    .map((_index, element) => ({
      hreflang: normalizeText(element.attribs.hreflang || ""),
      href: normalizeText(element.attribs.href || ""),
    }))
    .get()
    .filter((entry) => entry.hreflang.length > 0 && entry.href.length > 0);
  const structuredData = extractStructuredData($);
  const combinedRobotsSignals = `${normalizedMetaRobots},${normalizedXRobotsTag}`.toLowerCase();

  return {
    url,
    requestedUrl: options.requestedUrl || url,
    title: normalizeText($("title").first().text()),
    metaDescription: normalizeText($('meta[name="description"]').attr("content") || ""),
    canonical: normalizeText($('link[rel="canonical"]').attr("href") || ""),
    lang: normalizeText($("html").attr("lang") || ""),
    ogTitle: normalizeText($('meta[property="og:title"]').attr("content") || ""),
    ogDescription: normalizeText($('meta[property="og:description"]').attr("content") || ""),
    metaRobots: normalizedMetaRobots,
    xRobotsTag: normalizedXRobotsTag,
    isNoindex: combinedRobotsSignals
      .split(",")
      .map((entry) => entry.trim())
      .includes("noindex"),
    hreflangLinks,
    structuredDataTypes: structuredData.types,
    structuredDataValidations: structuredData.validations,
    bodyText,
    wordCount,
    sentenceCount,
    mainContentWordCount,
    boilerplateWordCount,
    paragraphs,
    headings,
    images,
    links,
    internalLinks,
    externalLinks,
    buttonCount,
    listCount,
    brokenInternalLinkCount: 0,
    statusCode: options.statusCode ?? 200,
    wasRedirected: options.wasRedirected ?? false,
    redirectCount: options.redirectCount ?? 0,
  };
}
