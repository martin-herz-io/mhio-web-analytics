import { EventEmitter } from "node:events";

import { createRequest, createResponse } from "node-mocks-http";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../src/app.js";

async function invokeApp(app: ReturnType<typeof createApp>, payload: { method: string; url: string; body: unknown }) {
  const request = createRequest({
    method: payload.method,
    url: payload.url,
    headers: {
      "content-type": "application/json",
    },
    body: payload.body,
  });
  const response = createResponse({
    eventEmitter: EventEmitter,
  });

  await new Promise<void>((resolve, reject) => {
    response.on("end", () => resolve());
    response.on("error", (error: Error) => reject(error));
    app.handle(request, response);
  });

  return response;
}

describe("POST /analyze", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns an analysis report for a valid HTML page", async () => {
    const html = `
      <!doctype html>
      <html lang="de">
        <head>
          <title>Beispielseite fuer den SEO Analyzer Test</title>
          <meta name="description" content="Dies ist eine ausreichend lange Meta Description fuer unseren ersten Analyzer Test mit sinnvoller Laenge und ordentlicher Struktur." />
          <meta property="og:title" content="OG Beispiel" />
          <meta property="og:description" content="OG Beschreibung" />
          <link rel="canonical" href="https://example.com/" />
          <link rel="alternate" hreflang="de-DE" href="https://example.com/" />
          <link rel="alternate" hreflang="x-default" href="https://example.com/" />
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "WebSite",
              "url": "https://example.com/"
            }
          </script>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Beispiel GmbH"
            }
          </script>
        </head>
        <body>
          <h1>Willkommen</h1>
          <h2>Ein Abschnitt</h2>
          <p>Das ist ein ausreichend langer Beispieltext mit mehreren Woertern, damit die Seite fuer den Test etwas Substanz mitbringt und nicht sofort als duenn eingestuft wird. Der Text bleibt trotzdem gut lesbar.</p>
          <p>Noch ein Absatz mit etwas mehr Inhalt fuer eine realistischere Analyse der Struktur und Lesbarkeit auf dieser kleinen Beispielseite. Dazu kommt eine kleine Liste fuer bessere Scanbarkeit.</p>
          <ul><li>Vorteil eins</li><li>Vorteil zwei</li></ul>
          <img src="/hero.jpg" alt="Hero Bild" />
          <a href="/kontakt">Kontakt</a>
          <a href="/leistungen">Leistungen</a>
          <button>Jetzt starten</button>
        </body>
      </html>
    `;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        url: "https://example.com/",
        status: 200,
        redirected: false,
        headers: {
          get: (name: string) => (name.toLowerCase() === "content-type" ? "text/html; charset=utf-8" : ""),
        },
        text: async () => html,
      }),
    );

    const response = await invokeApp(createApp(), {
      method: "POST",
      url: "/analyze",
      body: { url: "https://example.com" },
    });

    const json = response._getJSONData();

    expect(response.statusCode).toBe(200);
    expect(json.locale).toBe("en");
    expect(json.scores.overall).toBeGreaterThan(0);
    expect(json.metrics.wordCount).toBeGreaterThan(20);
    expect(json.metrics.hreflangCount).toBe(2);
    expect(json.metrics.structuredDataTypeCount).toBe(2);
    expect(json.metrics.invalidStructuredDataCount).toBe(1);
    expect(json.recommendations).toBeInstanceOf(Array);
    expect(json.checks.find((check: { id: string }) => check.id === "seo-title")?.message).toBe(
      "The title is present and falls within a strong SEO length range.",
    );
    expect(json.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "seo-title" }),
        expect.objectContaining({ id: "content-long-paragraphs" }),
        expect.objectContaining({ id: "ux-cta-presence" }),
        expect.objectContaining({ id: "seo-hreflang", status: "good" }),
        expect.objectContaining({ id: "seo-structured-data", status: "warning" }),
      ]),
    );
  });

  it("returns localized German messages when locale is set to de", async () => {
    const html = `
      <!doctype html>
      <html lang="de">
        <head>
          <title>Mehrere H1 Testseite</title>
        </head>
        <body>
          <h1>Erste H1</h1>
          <h1>Zweite H1</h1>
          <p>Ein etwas längerer deutscher Beispieltext, damit die Seite nicht vollständig leer wirkt und die Analyse sauber durchlaufen kann.</p>
        </body>
      </html>
    `;

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        url: "https://example.com/",
        status: 200,
        redirected: false,
        headers: {
          get: (name: string) => (name.toLowerCase() === "content-type" ? "text/html; charset=utf-8" : ""),
        },
        text: async () => html,
      }),
    );

    const response = await invokeApp(createApp(), {
      method: "POST",
      url: "/analyze",
      body: { url: "https://example.com", locale: "de" },
    });

    const json = response._getJSONData();
    const h1Check = json.checks.find((check: { id: string }) => check.id === "seo-h1");

    expect(response.statusCode).toBe(200);
    expect(json.locale).toBe("de");
    expect(h1Check?.message).toBe("Die Seite hat mehrere H1-Überschriften.");
  });

  it("optionally includes PageSpeed performance data", async () => {
    const html = `
      <!doctype html>
      <html lang="de">
        <head><title>Perf</title><meta name="description" content="Performance Test Seite mit etwas Inhalt fuer die Analyse." /></head>
        <body><h1>Perf</h1><p>Genug Inhalt fuer einen kleinen Test.</p></body>
      </html>
    `;

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);

        if (url.startsWith("https://www.googleapis.com/pagespeedonline/v5/runPagespeed")) {
          return {
            ok: true,
            status: 200,
            redirected: false,
            url,
            headers: { get: () => "application/json; charset=utf-8" },
            json: async () => ({
              lighthouseResult: {
                categories: {
                  performance: { score: 0.92 },
                },
                audits: {
                  "largest-contentful-paint": {
                    title: "Largest Contentful Paint",
                    displayValue: "2.0 s",
                    numericValue: 2000,
                  },
                },
              },
            }),
          };
        }

        return {
          ok: true,
          url: "https://example.com/",
          status: 200,
          redirected: false,
          headers: {
            get: (name: string) => (name.toLowerCase() === "content-type" ? "text/html; charset=utf-8" : ""),
          },
          text: async () => html,
        };
      }),
    );

    const response = await invokeApp(createApp(), {
      method: "POST",
      url: "/analyze",
      body: { url: "https://example.com", includePerformance: true, performanceStrategy: "mobile" },
    });

    const json = response._getJSONData();

    expect(response.statusCode).toBe(200);
    expect(json.performance).toEqual(
      expect.objectContaining({
        provider: "pagespeed-insights",
        status: "available",
        strategy: "mobile",
        score: 92,
      }),
    );
  });

  it("rejects an invalid body", async () => {
    const response = await invokeApp(createApp(), {
      method: "POST",
      url: "/analyze",
      body: { url: "not-a-url" },
    });

    expect(response.statusCode).toBe(400);
    expect(response._getJSONData().error).toBe("Invalid request body");
  });
});

describe("POST /analyze/site", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("crawls multiple internal pages and returns a site report", async () => {
    const responses = new Map<string, string>([
      [
        "https://example.com/robots.txt",
        `
          User-agent: *
          Disallow: /privat
          Sitemap: https://example.com/sitemap.xml
        `,
      ],
      [
        "https://example.com/sitemap.xml",
        `
          <?xml version="1.0" encoding="UTF-8"?>
          <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
            <url><loc>https://example.com/</loc></url>
            <url><loc>https://example.com/leistungen</loc></url>
            <url><loc>https://example.com/kontakt</loc></url>
            <url><loc>https://example.com/privat</loc></url>
          </urlset>
        `,
      ],
      [
        "https://example.com/",
        `
          <!doctype html>
          <html lang="de">
            <head>
              <title>Startseite Beispiel</title>
              <meta name="description" content="Die Startseite bietet einen ordentlichen Ueberblick mit genug Beschreibung fuer den Testlauf." />
              <link rel="canonical" href="https://example.com/" />
              <link rel="alternate" hreflang="de-DE" href="https://example.com/" />
              <script type="application/ld+json">
                {
                  "@context": "https://schema.org",
                  "@type": "WebSite",
                  "name": "Example"
                }
              </script>
            </head>
            <body>
              <h1>Home</h1>
              <p>Willkommen auf der Startseite mit ausreichend Text fuer unseren kleinen Site-Crawl Test. Hier gibt es Struktur, Kontext und erste interne Verlinkungen.</p>
              <a href="/leistungen">Leistungen</a>
              <a href="/kontakt">Kontakt</a>
            </body>
          </html>
        `,
      ],
      [
        "https://example.com/leistungen",
        `
          <!doctype html>
          <html lang="de">
            <head>
              <title>Leistungen Beispiel</title>
              <meta name="description" content="Eine zweite Testseite mit eigenem Inhalt fuer die domainweite Analyse und interne Verlinkung." />
              <link rel="canonical" href="https://example.com/falsches-ziel" />
              <link rel="alternate" hreflang="en-US" href="https://example.com/en/services" />
              <script type="application/ld+json">
                {
                  "@context": "https://schema.org",
                  "@type": "LocalBusiness",
                  "name": "Example Services"
                }
              </script>
            </head>
            <body>
              <h1>Leistungen</h1>
              <p>Diese Seite enthaelt weiteren Fliesstext und verlinkt zur Kontaktseite, damit der Crawler mehr als eine URL sauber verfolgen kann.</p>
              <a href="/kontakt">Kontakt</a>
              <a href="/kaputt">Kaputter Link</a>
            </body>
          </html>
        `,
      ],
      [
        "https://example.com/kontakt",
        `
          <!doctype html>
          <html lang="de">
            <head>
              <title>Kontakt Beispiel</title>
              <meta name="robots" content="noindex, follow" />
              <script type="application/ld+json">
                {
                  "@context": "https://schema.org",
                  "@type": "ContactPage",
                  "name": "Kontakt"
                }
              </script>
            </head>
            <body>
              <h1>Kontakt</h1>
              <p>Kurze Kontaktinformationen fuer den abschliessenden Testschritt des kleinen Site-Crawls.</p>
            </body>
          </html>
        `,
      ],
    ]);

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);

        if (url === "https://example.com/kaputt") {
          return {
            ok: false,
            status: 404,
            redirected: false,
            url,
          headers: {
            get: (name: string) => {
              const normalizedName = name.toLowerCase();
              if (normalizedName === "content-type") {
                return "text/html; charset=utf-8";
              }
              return "";
            },
          },
          text: async () => "",
        };
        }

        const html = responses.get(url);

        if (!html) {
          throw new Error(`Missing fixture for ${url}`);
        }

        return {
          ok: true,
          url: url === "https://example.com/leistungen" ? "https://example.com/services" : url,
          status: 200,
          redirected: url === "https://example.com/leistungen",
          headers: {
            get: (name: string) => {
              const normalizedName = name.toLowerCase();

              if (normalizedName === "content-type") {
                return url.endsWith(".xml")
                  ? "application/xml; charset=utf-8"
                  : url.endsWith("robots.txt")
                    ? "text/plain; charset=utf-8"
                    : "text/html; charset=utf-8";
              }

              if (normalizedName === "x-robots-tag" && url === "https://example.com/kontakt") {
                return "noindex, nofollow";
              }

              return "";
            },
          },
          text: async () => html,
        };
      }),
    );

    const response = await invokeApp(createApp(), {
      method: "POST",
      url: "/analyze/site",
      body: { url: "https://example.com/", maxPages: 5 },
    });

    const json = response._getJSONData();

    expect(response.statusCode).toBe(200);
    expect(json.locale).toBe("en");
    expect(json.crawl.crawledPages).toBe(4);
    expect(json.crawl.blockedByRobots).toBeGreaterThan(0);
    expect(json.crawl.seededFromSitemaps).toBeGreaterThan(0);
    expect(json.metrics.analyzedPages).toBe(3);
    expect(json.metrics.failedPages).toBe(1);
    expect(json.metrics.noindexPages).toBe(1);
    expect(json.metrics.xRobotsTagPages).toBe(1);
    expect(json.metrics.hreflangPages).toBe(2);
    expect(json.metrics.structuredDataPages).toBe(3);
    expect(json.metrics.pagesWithInvalidStructuredData).toBe(2);
    expect(json.metrics.redirectedPages).toBe(1);
    expect(json.metrics.canonicalConflictPages).toBe(1);
    expect(json.metrics.pagesWithBrokenInternalLinks).toBe(1);
    expect(json.linkGraph.edgeCount).toBeGreaterThan(0);
    expect(Array.isArray(json.linkGraph.nodes)).toBe(true);
    expect(json.pages).toHaveLength(4);
    expect(json.siteIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "site-missing-meta-description" }),
        expect.objectContaining({ id: "site-noindex-pages" }),
        expect.objectContaining({ id: "site-canonical-conflicts" }),
        expect.objectContaining({ id: "site-broken-internal-links" }),
        expect.objectContaining({ id: "site-invalid-structured-data" }),
      ]),
    );
    expect(
      json.pages.some(
        (page: { report?: { checks?: Array<{ id: string; status: string }> } }) =>
          page.report?.checks?.some(
            (check) =>
              (check.id === "seo-broken-internal-links" || check.id === "seo-x-robots-tag") && check.status !== "good",
          ),
      ),
    ).toBe(true);
  });

  it("normalizes duplicate internal URLs before crawling", async () => {
    const responses = new Map<string, string>([
      [
        "https://example.com/robots.txt",
        `
          User-agent: *
          Sitemap: https://example.com/sitemap.xml
        `,
      ],
      [
        "https://example.com/sitemap.xml",
        `
          <?xml version="1.0" encoding="UTF-8"?>
          <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
            <url><loc>https://example.com/about/</loc></url>
          </urlset>
        `,
      ],
      [
        "https://example.com/",
        `
          <!doctype html>
          <html lang="de">
            <head>
              <title>Home</title>
              <meta name="description" content="Startseite fuer URL-Normalisierung." />
            </head>
            <body>
              <h1>Home</h1>
              <p>Kurzer Text fuer die Startseite.</p>
              <a href="/about/">About</a>
              <a href="/about#team">About Team</a>
            </body>
          </html>
        `,
      ],
      [
        "https://example.com/about",
        `
          <!doctype html>
          <html lang="de">
            <head>
              <title>About</title>
              <meta name="description" content="About Seite." />
            </head>
            <body>
              <h1>About</h1>
              <p>Inhalt der About-Seite.</p>
            </body>
          </html>
        `,
      ],
    ]);

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        const normalizedUrl = url === "https://example.com/about/" ? "https://example.com/about" : url;
        const html = responses.get(normalizedUrl);

        if (!html) {
          throw new Error(`Missing fixture for ${normalizedUrl}`);
        }

        return {
          ok: true,
          url: normalizedUrl,
          status: 200,
          redirected: normalizedUrl !== url,
          headers: {
            get: (name: string) => {
              const normalizedName = name.toLowerCase();

              if (normalizedName === "content-type") {
                return normalizedUrl.endsWith(".xml") ? "application/xml; charset=utf-8" : "text/html; charset=utf-8";
              }

              return "";
            },
          },
          text: async () => html,
        };
      }),
    );

    const response = await invokeApp(createApp(), {
      method: "POST",
      url: "/analyze/site",
      body: { url: "https://example.com/", maxPages: 5 },
    });

    const json = response._getJSONData();

    expect(response.statusCode).toBe(200);
    expect(json.crawl.crawledPages).toBe(2);
    expect(json.pages).toHaveLength(2);
    expect(json.pages.filter((page: { url: string }) => page.url.includes("/about")).length).toBe(1);
  });

  it("reports duplicate and thin content on site level", async () => {
    const responses = new Map<string, string>([
      [
        "https://example.com/robots.txt",
        `
          User-agent: *
        `,
      ],
      [
        "https://example.com/",
        `
          <!doctype html>
          <html lang="de">
            <head>
              <title>Landing</title>
              <meta name="description" content="Kurze Landingpage." />
            </head>
            <body>
              <h1>Landing</h1>
              <p>Sehr kurzer Text.</p>
              <a href="/a">A</a>
              <a href="/b">B</a>
            </body>
          </html>
        `,
      ],
      [
        "https://example.com/a",
        `
          <!doctype html>
          <html lang="de">
            <head>
              <title>Duplikat</title>
              <meta name="description" content="Gleiche Beschreibung" />
            </head>
            <body>
              <h1>Leistung</h1>
              <p>Dies ist fast identischer Inhalt fuer einen Duplicate-Content-Test mit genug Woertern fuer den Fingerprint Vergleich.</p>
            </body>
          </html>
        `,
      ],
      [
        "https://example.com/b",
        `
          <!doctype html>
          <html lang="de">
            <head>
              <title>Duplikat</title>
              <meta name="description" content="Gleiche Beschreibung" />
            </head>
            <body>
              <h1>Leistung</h1>
              <p>Dies ist fast identischer Inhalt fuer einen Duplicate-Content-Test mit genug Woertern fuer den Fingerprint Vergleich.</p>
            </body>
          </html>
        `,
      ],
    ]);

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        const html = responses.get(url);

        if (!html) {
          throw new Error(`Missing fixture for ${url}`);
        }

        return {
          ok: true,
          url,
          status: 200,
          redirected: false,
          headers: {
            get: (name: string) => {
              const normalizedName = name.toLowerCase();
              if (normalizedName === "content-type") {
                return url.endsWith("robots.txt") ? "text/plain; charset=utf-8" : "text/html; charset=utf-8";
              }
              return "";
            },
          },
          text: async () => html,
        };
      }),
    );

    const response = await invokeApp(createApp(), {
      method: "POST",
      url: "/analyze/site",
      body: { url: "https://example.com/", maxPages: 5 },
    });

    const json = response._getJSONData();

    expect(response.statusCode).toBe(200);
    expect(json.metrics.duplicateTitleCount).toBe(1);
    expect(json.metrics.duplicateMetaDescriptionCount).toBe(1);
    expect(json.metrics.duplicateContentGroups).toBe(1);
    expect(json.metrics.thinContentPages).toBe(3);
    expect(json.siteIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "site-duplicate-content" }),
        expect.objectContaining({ id: "site-thin-content" }),
      ]),
    );
  });

  it("optionally aggregates performance and link graph data for a site crawl", async () => {
    const responses = new Map<string, string>([
      ["https://example.com/robots.txt", "User-agent: *"],
      [
        "https://example.com/",
        `
          <!doctype html>
          <html lang="de">
            <head><title>Home</title><meta name="description" content="Home Description" /></head>
            <body><h1>Home</h1><p>Etwas Inhalt fuer den Start.</p><a href="/services">Services</a></body>
          </html>
        `,
      ],
      [
        "https://example.com/services",
        `
          <!doctype html>
          <html lang="de">
            <head><title>Services</title><meta name="description" content="Services Description" /></head>
            <body><h1>Services</h1><p>Etwas Inhalt fuer Services.</p></body>
          </html>
        `,
      ],
    ]);

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);

        if (url.startsWith("https://www.googleapis.com/pagespeedonline/v5/runPagespeed")) {
          return {
            ok: true,
            status: 200,
            redirected: false,
            url,
            headers: { get: () => "application/json; charset=utf-8" },
            json: async () => ({
              lighthouseResult: {
                categories: {
                  performance: { score: 0.81 },
                },
                audits: {},
              },
            }),
          };
        }

        const html = responses.get(url);

        if (!html) {
          throw new Error(`Missing fixture for ${url}`);
        }

        return {
          ok: true,
          url,
          status: 200,
          redirected: false,
          headers: {
            get: (name: string) => {
              const normalizedName = name.toLowerCase();
              if (normalizedName === "content-type") {
                return url.endsWith("robots.txt") ? "text/plain; charset=utf-8" : "text/html; charset=utf-8";
              }
              return "";
            },
          },
          text: async () => html,
        };
      }),
    );

    const response = await invokeApp(createApp(), {
      method: "POST",
      url: "/analyze/site",
      body: {
        url: "https://example.com/",
        maxPages: 5,
        includePerformance: true,
        performanceStrategy: "desktop",
      },
    });

    const json = response._getJSONData();

    expect(response.statusCode).toBe(200);
    expect(json.metrics.pagesWithPerformanceData).toBe(2);
    expect(json.metrics.averagePerformanceScore).toBe(81);
    expect(json.linkGraph.edgeCount).toBe(1);
    expect(json.linkGraph.pagesWithoutIncomingInternalLinks).toEqual([]);
    expect(json.pages.every((page: { report?: { performance?: { strategy?: string } } }) => page.report?.performance?.strategy === "desktop")).toBe(
      true,
    );
  });

  it("reports hreflang inconsistencies, canonical clusters and boilerplate-heavy pages", async () => {
    const responses = new Map<string, string>([
      ["https://example.com/robots.txt", "User-agent: *"],
      [
        "https://example.com/",
        `
          <!doctype html>
          <html lang="de">
            <head>
              <title>Home</title>
              <meta name="description" content="Home Description" />
              <link rel="canonical" href="https://example.com/" />
              <link rel="alternate" hreflang="de-DE" href="https://example.com/" />
              <link rel="alternate" hreflang="en-US" href="https://example.com/en" />
            </head>
            <body>
              <header>Navigation Start Leistungen Kontakt Hilfe Support Produkte Preise FAQ Login Unternehmen Agentur Referenzen Kunden Team Karriere Partner Presse Sicherheit API Docs Integrationen Plattform Features Module Workflows Analytics Monitoring Reports Dashboards Audits Consulting Training Workshops Services Solutions Enterprise SMB Growth SEO Content UX Design</header>
              <nav>Home Leistungen Kontakt Blog Docs Hilfe Produkte Preise Features Plattform Integrationen Sicherheit Login Demo Support Beratung Ressourcen Tutorials Guides API Status Changelog Downloads Whitepaper Webinare Success Stories Roadmap Community Forum</nav>
              <main><h1>Home</h1><p>Etwas Hauptinhalt.</p><a href="/en">EN</a><a href="/landing">Landing</a></main>
              <footer>Footer Links Impressum Datenschutz Karriere Partner Presse Kontakt</footer>
            </body>
          </html>
        `,
      ],
      [
        "https://example.com/en",
        `
          <!doctype html>
          <html lang="en">
            <head>
              <title>Home EN</title>
              <meta name="description" content="English Home" />
              <link rel="canonical" href="https://example.com/cluster-target" />
            </head>
            <body>
              <h1>English</h1>
              <p>English page without return hreflang.</p>
            </body>
          </html>
        `,
      ],
      [
        "https://example.com/landing",
        `
          <!doctype html>
          <html lang="de">
            <head>
              <title>Landing</title>
              <meta name="description" content="Landing Description" />
              <link rel="canonical" href="https://example.com/cluster-target" />
            </head>
            <body>
              <header>Sehr viele Menuepunkte Angebote Features Preise Blog Karriere Hilfe Kontakt Support Login Partner API Docs Sicherheit Unternehmen Agentur Referenzen Kunden Team Karriere Partner Presse Plattform Features Module Workflows Analytics Monitoring Reports Dashboards Audits Consulting Training Workshops Services Solutions Enterprise SMB Growth SEO Content UX Design</header>
              <nav>Home Leistungen Kontakt Blog Docs Hilfe Produkte Preise Features Plattform Integrationen Sicherheit Login Demo Support Beratung Ressourcen Tutorials Guides API Status Changelog Downloads Whitepaper Webinare Success Stories Roadmap Community Forum</nav>
              <main><h1>Landing</h1><p>Kurz.</p></main>
              <footer>Footer Links Impressum Datenschutz Karriere Partner Presse Kontakt</footer>
            </body>
          </html>
        `,
      ],
    ]);

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        const html = responses.get(url);

        if (!html) {
          throw new Error(`Missing fixture for ${url}`);
        }

        return {
          ok: true,
          url,
          status: 200,
          redirected: false,
          headers: {
            get: (name: string) => {
              const normalizedName = name.toLowerCase();
              if (normalizedName === "content-type") {
                return url.endsWith("robots.txt") ? "text/plain; charset=utf-8" : "text/html; charset=utf-8";
              }
              return "";
            },
          },
          text: async () => html,
        };
      }),
    );

    const response = await invokeApp(createApp(), {
      method: "POST",
      url: "/analyze/site",
      body: { url: "https://example.com/", maxPages: 5 },
    });

    const json = response._getJSONData();

    expect(response.statusCode).toBe(200);
    expect(json.metrics.canonicalClusterCount).toBe(1);
    expect(json.metrics.hreflangInconsistencyPages).toBe(1);
    expect(json.metrics.pagesWithLowMainContentShare).toBeGreaterThan(0);
    expect(json.siteIssues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "site-canonical-clusters" }),
        expect.objectContaining({ id: "site-hreflang-inconsistencies" }),
        expect.objectContaining({ id: "site-boilerplate-heavy-pages" }),
      ]),
    );
  });
});

describe("Documentation", () => {
  it("returns the OpenAPI document", async () => {
    const response = await invokeApp(createApp(), {
      method: "GET",
      url: "/openapi.json",
      body: undefined,
    });

    const json = response._getJSONData();

    expect(response.statusCode).toBe(200);
    expect(json.openapi).toBe("3.1.0");
    expect(json.paths["/analyze"]).toBeDefined();
    expect(json.paths["/analyze/site"]).toBeDefined();
    expect(json.components.schemas.AnalyzePageRequest.properties.locale).toBeDefined();
    expect(json.components.schemas.AnalysisReport.properties.locale).toBeDefined();
  });
});
