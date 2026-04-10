import { createCheck } from "./checkHelpers.js";
import type { AnalysisCheck, PageData } from "../types/analysis.js";

function getHeadingHierarchyIssues(pageData: PageData): number {
  let previousLevel = 0;
  let issues = 0;

  for (const heading of pageData.headings) {
    if (previousLevel !== 0 && heading.level - previousLevel > 1) {
      issues += 1;
    }
    previousLevel = heading.level;
  }

  return issues;
}

export function runSeoChecks(pageData: PageData): AnalysisCheck[] {
  const checks: AnalysisCheck[] = [];
  const titleLength = pageData.title.length;
  const descriptionLength = pageData.metaDescription.length;
  const h1Count = pageData.headings.filter((heading) => heading.level === 1).length;
  const imagesWithoutAlt = pageData.images.filter((image) => !image.alt).length;
  const hierarchyIssues = getHeadingHierarchyIssues(pageData);
  const canonicalMatchesFinalUrl =
    pageData.canonical.length > 0 &&
    (() => {
      try {
        return new URL(pageData.canonical, pageData.url).toString() === pageData.url;
      } catch {
        return false;
      }
    })();
  const invalidStructuredData = pageData.structuredDataValidations.filter((entry) => !entry.isValid);

  checks.push(
    createCheck({
      id: "seo-title",
      category: "seo",
      status: titleLength >= 30 && titleLength <= 60 ? "good" : titleLength > 0 ? "warning" : "bad",
      score: titleLength >= 30 && titleLength <= 60 ? 10 : titleLength > 0 ? 5 : 0,
      maxScore: 10,
      message:
        titleLength >= 30 && titleLength <= 60
          ? "Title ist vorhanden und hat eine gute SEO-Laenge."
          : titleLength > 0
            ? "Title ist vorhanden, koennte aber in der Laenge optimiert werden."
            : "Title fehlt komplett.",
      details: { titleLength },
    }),
  );

  checks.push(
    createCheck({
      id: "seo-meta-description",
      category: "seo",
      status:
        descriptionLength >= 120 && descriptionLength <= 160 ? "good" : descriptionLength > 0 ? "warning" : "bad",
      score: descriptionLength >= 120 && descriptionLength <= 160 ? 10 : descriptionLength > 0 ? 5 : 0,
      maxScore: 10,
      message:
        descriptionLength >= 120 && descriptionLength <= 160
          ? "Meta Description ist vorhanden und hat eine solide Laenge."
          : descriptionLength > 0
            ? "Meta Description ist vorhanden, aber nicht im idealen Bereich."
            : "Meta Description fehlt.",
      details: { descriptionLength },
    }),
  );

  checks.push(
    createCheck({
      id: "seo-h1",
      category: "seo",
      status: h1Count === 1 ? "good" : h1Count > 1 ? "warning" : "bad",
      score: h1Count === 1 ? 8 : h1Count > 1 ? 4 : 0,
      maxScore: 8,
      message:
        h1Count === 1
          ? "Die Seite hat genau eine H1."
          : h1Count > 1
            ? "Die Seite hat mehrere H1-Ueberschriften."
            : "Es wurde keine H1 gefunden.",
      details: { h1Count },
    }),
  );

  checks.push(
    createCheck({
      id: "seo-heading-hierarchy",
      category: "seo",
      status: hierarchyIssues === 0 ? "good" : hierarchyIssues <= 1 ? "warning" : "bad",
      score: hierarchyIssues === 0 ? 6 : hierarchyIssues <= 1 ? 3 : 0,
      maxScore: 6,
      message:
        hierarchyIssues === 0
          ? "Die Heading-Hierarchie wirkt sauber aufgebaut."
          : hierarchyIssues <= 1
            ? "Die Heading-Hierarchie hat kleinere Spruenge."
            : "Die Heading-Hierarchie springt mehrfach und erschwert Strukturverstaendnis.",
      details: { hierarchyIssues },
    }),
  );

  checks.push(
    createCheck({
      id: "seo-canonical",
      category: "seo",
      status: !pageData.canonical ? "warning" : canonicalMatchesFinalUrl ? "good" : "bad",
      score: !pageData.canonical ? 2 : canonicalMatchesFinalUrl ? 6 : 0,
      maxScore: 6,
      message: !pageData.canonical
        ? "Canonical URL fehlt."
        : canonicalMatchesFinalUrl
          ? "Canonical URL ist gesetzt."
          : "Canonical verweist nicht auf die aktuell analysierte Zielseite.",
      details: { canonical: pageData.canonical, canonicalMatchesFinalUrl },
    }),
  );

  checks.push(
    createCheck({
      id: "seo-lang",
      category: "seo",
      status: pageData.lang ? "good" : "warning",
      score: pageData.lang ? 5 : 2,
      maxScore: 5,
      message: pageData.lang ? "Das HTML `lang` Attribut ist gesetzt." : "Das HTML `lang` Attribut fehlt.",
      details: { lang: pageData.lang },
    }),
  );

  checks.push(
    createCheck({
      id: "seo-image-alt",
      category: "seo",
      status:
        pageData.images.length === 0 || imagesWithoutAlt === 0
          ? "good"
          : imagesWithoutAlt <= Math.ceil(pageData.images.length * 0.25)
            ? "warning"
            : "bad",
      score:
        pageData.images.length === 0 || imagesWithoutAlt === 0
          ? 7
          : imagesWithoutAlt <= Math.ceil(pageData.images.length * 0.25)
            ? 3
            : 0,
      maxScore: 7,
      message:
        pageData.images.length === 0 || imagesWithoutAlt === 0
          ? "Bilder sind sauber mit Alt-Texten versehen."
          : imagesWithoutAlt <= Math.ceil(pageData.images.length * 0.25)
            ? "Einige Bilder haben keinen Alt-Text."
            : "Viele Bilder haben keinen Alt-Text.",
      details: {
        imageCount: pageData.images.length,
        imagesWithoutAlt,
      },
    }),
  );

  checks.push(
    createCheck({
      id: "seo-indexability",
      category: "seo",
      status: pageData.isNoindex ? "bad" : "good",
      score: pageData.isNoindex ? 0 : 7,
      maxScore: 7,
      message: pageData.isNoindex
        ? "Die Seite ist per Meta-Robots auf noindex gesetzt."
        : "Die Seite ist grundsaetzlich indexierbar.",
      details: {
        metaRobots: pageData.metaRobots,
        xRobotsTag: pageData.xRobotsTag,
        isNoindex: pageData.isNoindex,
      },
    }),
  );

  checks.push(
    createCheck({
      id: "seo-x-robots-tag",
      category: "seo",
      status: pageData.xRobotsTag
        ? pageData.xRobotsTag.toLowerCase().includes("noindex")
          ? "bad"
          : "warning"
        : "good",
      score: pageData.xRobotsTag
        ? pageData.xRobotsTag.toLowerCase().includes("noindex")
          ? 0
          : 3
        : 5,
      maxScore: 5,
      message: !pageData.xRobotsTag
        ? "Es wurde kein X-Robots-Tag Header erkannt."
        : pageData.xRobotsTag.toLowerCase().includes("noindex")
          ? "Der Server sendet einen X-Robots-Tag mit noindex."
          : "Ein X-Robots-Tag Header ist vorhanden und sollte fachlich geprueft werden.",
      details: {
        xRobotsTag: pageData.xRobotsTag,
      },
    }),
  );

  checks.push(
    createCheck({
      id: "seo-status-code",
      category: "seo",
      status: pageData.statusCode >= 200 && pageData.statusCode < 300 ? "good" : pageData.statusCode < 400 ? "warning" : "bad",
      score: pageData.statusCode >= 200 && pageData.statusCode < 300 ? 6 : pageData.statusCode < 400 ? 3 : 0,
      maxScore: 6,
      message:
        pageData.statusCode >= 200 && pageData.statusCode < 300
          ? "Die Seite liefert einen erfolgreichen Statuscode."
          : pageData.statusCode < 400
            ? "Die Seite wurde nur ueber eine Weiterleitung erreicht."
            : "Die Seite liefert keinen erfolgreichen Statuscode.",
      details: {
        statusCode: pageData.statusCode,
      },
    }),
  );

  checks.push(
    createCheck({
      id: "seo-redirect",
      category: "seo",
      status: pageData.wasRedirected ? "warning" : "good",
      score: pageData.wasRedirected ? 3 : 6,
      maxScore: 6,
      message: pageData.wasRedirected
        ? "Die URL fuehrt ueber mindestens eine Weiterleitung."
        : "Die URL ist direkt ohne Weiterleitung erreichbar.",
      details: {
        requestedUrl: pageData.requestedUrl,
        fetchedUrl: pageData.url,
        redirectCount: pageData.redirectCount,
      },
    }),
  );

  checks.push(
    createCheck({
      id: "seo-open-graph",
      category: "seo",
      status:
        pageData.ogTitle && pageData.ogDescription ? "good" : pageData.ogTitle || pageData.ogDescription ? "warning" : "bad",
      score: pageData.ogTitle && pageData.ogDescription ? 6 : pageData.ogTitle || pageData.ogDescription ? 3 : 0,
      maxScore: 6,
      message:
        pageData.ogTitle && pageData.ogDescription
          ? "Open Graph Basisdaten sind vorhanden."
          : pageData.ogTitle || pageData.ogDescription
            ? "Open Graph Daten sind nur teilweise vorhanden."
            : "Open Graph Basisdaten fehlen.",
      details: {
        ogTitle: Boolean(pageData.ogTitle),
        ogDescription: Boolean(pageData.ogDescription),
      },
    }),
  );

  checks.push(
    createCheck({
      id: "seo-hreflang",
      category: "seo",
      status:
        pageData.hreflangLinks.length === 0
          ? "warning"
          : pageData.hreflangLinks.some((entry) => entry.hreflang.toLowerCase() === "x-default")
            ? "good"
            : "warning",
      score:
        pageData.hreflangLinks.length === 0
          ? 2
          : pageData.hreflangLinks.some((entry) => entry.hreflang.toLowerCase() === "x-default")
            ? 6
            : 4,
      maxScore: 6,
      message:
        pageData.hreflangLinks.length === 0
          ? "Es wurden keine hreflang-Verweise gefunden."
          : pageData.hreflangLinks.some((entry) => entry.hreflang.toLowerCase() === "x-default")
            ? "hreflang-Verweise inklusive x-default sind vorhanden."
            : "hreflang-Verweise sind vorhanden, aber ohne x-default.",
      details: {
        hreflangCount: pageData.hreflangLinks.length,
        hreflangValues: pageData.hreflangLinks.map((entry) => entry.hreflang),
      },
    }),
  );

  checks.push(
    createCheck({
      id: "seo-structured-data",
      category: "seo",
      status:
        pageData.structuredDataTypes.length === 0
          ? "warning"
          : invalidStructuredData.length > 0
            ? "warning"
            : "good",
      score: pageData.structuredDataTypes.length === 0 ? 2 : invalidStructuredData.length > 0 ? 4 : 7,
      maxScore: 7,
      message:
        pageData.structuredDataTypes.length === 0
          ? "Es wurde kein strukturiertes JSON-LD Markup erkannt."
          : invalidStructuredData.length > 0
            ? "Strukturierte Daten sind vorhanden, aber teilweise unvollstaendig."
            : "Strukturierte Daten sind vorhanden.",
      details: {
        structuredDataTypes: pageData.structuredDataTypes,
        invalidStructuredData,
      },
    }),
  );

  checks.push(
    createCheck({
      id: "seo-internal-links",
      category: "seo",
      status: pageData.internalLinks >= 3 ? "good" : pageData.internalLinks >= 1 ? "warning" : "bad",
      score: pageData.internalLinks >= 3 ? 5 : pageData.internalLinks >= 1 ? 2 : 0,
      maxScore: 5,
      message:
        pageData.internalLinks >= 3
          ? "Es sind mehrere interne Links vorhanden."
          : pageData.internalLinks >= 1
            ? "Einige interne Links sind vorhanden, es gibt aber noch Luft nach oben."
            : "Es wurden keine internen Links gefunden.",
      details: { internalLinks: pageData.internalLinks },
    }),
  );

  checks.push(
    createCheck({
      id: "seo-broken-internal-links",
      category: "seo",
      status:
        pageData.brokenInternalLinkCount === 0
          ? "good"
          : pageData.brokenInternalLinkCount <= 2
            ? "warning"
            : "bad",
      score:
        pageData.brokenInternalLinkCount === 0
          ? 7
          : pageData.brokenInternalLinkCount <= 2
            ? 3
            : 0,
      maxScore: 7,
      message:
        pageData.brokenInternalLinkCount === 0
          ? "Es wurden keine defekten internen Links erkannt."
          : pageData.brokenInternalLinkCount <= 2
            ? "Einige interne Links scheinen defekt zu sein."
            : "Mehrere interne Links sind defekt und sollten dringend korrigiert werden.",
      details: {
        brokenInternalLinkCount: pageData.brokenInternalLinkCount,
      },
    }),
  );

  return checks;
}
