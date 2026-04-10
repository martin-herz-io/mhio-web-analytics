import { createCheck } from "./checkHelpers.js";
import { text } from "../i18n/index.js";
import type { AnalysisCheck, Locale, PageData } from "../types/analysis.js";

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

export function runSeoChecks(pageData: PageData, locale: Locale): AnalysisCheck[] {
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
          ? text(locale, {
              en: "The title is present and falls within a strong SEO length range.",
              de: "Der Title ist vorhanden und hat eine gute SEO-Länge.",
            })
          : titleLength > 0
            ? text(locale, {
                en: "The title is present but could be improved in length.",
                de: "Der Title ist vorhanden, könnte aber in der Länge optimiert werden.",
              })
            : text(locale, {
                en: "The title is missing entirely.",
                de: "Der Title fehlt komplett.",
              }),
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
          ? text(locale, {
              en: "The meta description is present and within a solid length range.",
              de: "Die Meta Description ist vorhanden und hat eine solide Länge.",
            })
          : descriptionLength > 0
            ? text(locale, {
                en: "The meta description is present but not in the ideal range.",
                de: "Die Meta Description ist vorhanden, aber nicht im idealen Bereich.",
              })
            : text(locale, {
                en: "The meta description is missing.",
                de: "Die Meta Description fehlt.",
              }),
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
          ? text(locale, {
              en: "The page has exactly one H1.",
              de: "Die Seite hat genau eine H1.",
            })
          : h1Count > 1
            ? text(locale, {
                en: "The page contains multiple H1 headings.",
                de: "Die Seite hat mehrere H1-Überschriften.",
              })
            : text(locale, {
                en: "No H1 was found.",
                de: "Es wurde keine H1 gefunden.",
              }),
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
          ? text(locale, {
              en: "The heading hierarchy looks clean and consistent.",
              de: "Die Heading-Hierarchie wirkt sauber aufgebaut.",
            })
          : hierarchyIssues <= 1
            ? text(locale, {
                en: "The heading hierarchy has minor jumps.",
                de: "Die Heading-Hierarchie hat kleinere Sprünge.",
              })
            : text(locale, {
                en: "The heading hierarchy jumps multiple times and weakens structural clarity.",
                de: "Die Heading-Hierarchie springt mehrfach und erschwert das Strukturverständnis.",
              }),
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
        ? text(locale, {
            en: "The canonical URL is missing.",
            de: "Die Canonical-URL fehlt.",
          })
        : canonicalMatchesFinalUrl
          ? text(locale, {
              en: "The canonical URL is set.",
              de: "Die Canonical-URL ist gesetzt.",
            })
          : text(locale, {
              en: "The canonical does not point to the currently analyzed destination URL.",
              de: "Die Canonical verweist nicht auf die aktuell analysierte Zielseite.",
            }),
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
      message: pageData.lang
        ? text(locale, {
            en: "The HTML `lang` attribute is set.",
            de: "Das HTML-`lang`-Attribut ist gesetzt.",
          })
        : text(locale, {
            en: "The HTML `lang` attribute is missing.",
            de: "Das HTML-`lang`-Attribut fehlt.",
          }),
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
          ? text(locale, {
              en: "Images are properly covered with alt text.",
              de: "Die Bilder sind sauber mit Alt-Texten versehen.",
            })
          : imagesWithoutAlt <= Math.ceil(pageData.images.length * 0.25)
            ? text(locale, {
                en: "Some images are missing alt text.",
                de: "Einige Bilder haben keinen Alt-Text.",
              })
            : text(locale, {
                en: "Many images are missing alt text.",
                de: "Viele Bilder haben keinen Alt-Text.",
              }),
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
        ? text(locale, {
            en: "The page is set to noindex via meta robots.",
            de: "Die Seite ist per Meta-Robots auf noindex gesetzt.",
          })
        : text(locale, {
            en: "The page is generally indexable.",
            de: "Die Seite ist grundsätzlich indexierbar.",
          }),
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
        ? text(locale, {
            en: "No X-Robots-Tag header was detected.",
            de: "Es wurde kein X-Robots-Tag-Header erkannt.",
          })
        : pageData.xRobotsTag.toLowerCase().includes("noindex")
          ? text(locale, {
              en: "The server sends an X-Robots-Tag with noindex.",
              de: "Der Server sendet einen X-Robots-Tag mit noindex.",
            })
          : text(locale, {
              en: "An X-Robots-Tag header is present and should be reviewed.",
              de: "Ein X-Robots-Tag-Header ist vorhanden und sollte fachlich geprüft werden.",
            }),
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
          ? text(locale, {
              en: "The page returns a successful status code.",
              de: "Die Seite liefert einen erfolgreichen Statuscode.",
            })
          : pageData.statusCode < 400
            ? text(locale, {
                en: "The page was reached through a redirect.",
                de: "Die Seite wurde nur über eine Weiterleitung erreicht.",
              })
            : text(locale, {
                en: "The page does not return a successful status code.",
                de: "Die Seite liefert keinen erfolgreichen Statuscode.",
              }),
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
        ? text(locale, {
            en: "The URL resolves through at least one redirect.",
            de: "Die URL führt über mindestens eine Weiterleitung.",
          })
        : text(locale, {
            en: "The URL is reachable directly without a redirect.",
            de: "Die URL ist direkt ohne Weiterleitung erreichbar.",
          }),
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
          ? text(locale, {
              en: "Core Open Graph data is present.",
              de: "Die Open-Graph-Basisdaten sind vorhanden.",
            })
          : pageData.ogTitle || pageData.ogDescription
            ? text(locale, {
                en: "Open Graph data is only partially present.",
                de: "Die Open-Graph-Daten sind nur teilweise vorhanden.",
              })
            : text(locale, {
                en: "Core Open Graph data is missing.",
                de: "Die Open-Graph-Basisdaten fehlen.",
              }),
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
          ? text(locale, {
              en: "No hreflang references were found.",
              de: "Es wurden keine hreflang-Verweise gefunden.",
            })
          : pageData.hreflangLinks.some((entry) => entry.hreflang.toLowerCase() === "x-default")
            ? text(locale, {
                en: "hreflang references including x-default are present.",
                de: "hreflang-Verweise inklusive x-default sind vorhanden.",
              })
            : text(locale, {
                en: "hreflang references are present, but x-default is missing.",
                de: "hreflang-Verweise sind vorhanden, aber ohne x-default.",
              }),
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
          ? text(locale, {
              en: "No structured JSON-LD markup was detected.",
              de: "Es wurde kein strukturiertes JSON-LD-Markup erkannt.",
            })
          : invalidStructuredData.length > 0
            ? text(locale, {
                en: "Structured data is present but partially incomplete.",
                de: "Strukturierte Daten sind vorhanden, aber teilweise unvollständig.",
              })
            : text(locale, {
                en: "Structured data is present.",
                de: "Strukturierte Daten sind vorhanden.",
              }),
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
          ? text(locale, {
              en: "Multiple internal links are present.",
              de: "Es sind mehrere interne Links vorhanden.",
            })
          : pageData.internalLinks >= 1
            ? text(locale, {
                en: "Some internal links are present, but there is still room to improve.",
                de: "Einige interne Links sind vorhanden, es gibt aber noch Luft nach oben.",
              })
            : text(locale, {
                en: "No internal links were found.",
                de: "Es wurden keine internen Links gefunden.",
              }),
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
          ? text(locale, {
              en: "No broken internal links were detected.",
              de: "Es wurden keine defekten internen Links erkannt.",
            })
          : pageData.brokenInternalLinkCount <= 2
            ? text(locale, {
                en: "Some internal links appear to be broken.",
                de: "Einige interne Links scheinen defekt zu sein.",
              })
            : text(locale, {
                en: "Multiple internal links are broken and should be fixed urgently.",
                de: "Mehrere interne Links sind defekt und sollten dringend korrigiert werden.",
              }),
      details: {
        brokenInternalLinkCount: pageData.brokenInternalLinkCount,
      },
    }),
  );

  return checks;
}
