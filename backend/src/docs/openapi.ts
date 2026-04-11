export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "mhio Web Analytics API",
    version: "0.0.1",
    description: "API-first website analyzer for SEO, content flow, UX heuristics, and site crawling.",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local development server",
    },
  ],
  tags: [
    { name: "Health", description: "Service health checks" },
    { name: "Analyze", description: "Single page and sitewide analysis endpoints" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        responses: {
          "200": {
            description: "Service is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/analyze": {
      post: {
        tags: ["Analyze"],
        summary: "Analyze a single page",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/AnalyzePageRequest",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Single page analysis report",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/AnalysisReport",
                },
              },
            },
          },
          "400": {
            description: "Invalid request body",
          },
        },
      },
    },
    "/analyze/site": {
      post: {
        tags: ["Analyze"],
        summary: "Crawl and analyze multiple internal pages of a site",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/AnalyzeSiteRequest",
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Sitewide analysis report",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/SiteAnalysisReport",
                },
              },
            },
          },
          "400": {
            description: "Invalid request body",
          },
        },
      },
    },
  },
  components: {
    schemas: {
      AnalyzePageRequest: {
        type: "object",
        required: ["url"],
        properties: {
          url: {
            type: "string",
            format: "uri",
            example: "https://example.com",
          },
          locale: {
            type: "string",
            enum: ["en", "de"],
            default: "en",
            example: "en",
          },
          includePerformance: {
            type: "boolean",
            example: true,
          },
          performanceStrategy: {
            type: "string",
            enum: ["mobile", "desktop"],
            example: "mobile",
          },
        },
      },
      AnalyzeSiteRequest: {
        type: "object",
        required: ["url"],
        properties: {
          url: {
            type: "string",
            format: "uri",
            example: "https://example.com",
          },
          locale: {
            type: "string",
            enum: ["en", "de"],
            default: "en",
            example: "de",
          },
          maxPages: {
            type: "integer",
            minimum: 1,
            maximum: 50,
            example: 10,
          },
          includePerformance: {
            type: "boolean",
            example: true,
          },
          performanceStrategy: {
            type: "string",
            enum: ["mobile", "desktop"],
            example: "mobile",
          },
        },
      },
      ScoreBreakdown: {
        type: "object",
        properties: {
          overall: { type: "integer", example: 78 },
          seo: { type: "integer", example: 82 },
          content: { type: "integer", example: 74 },
          ux: { type: "integer", example: 71 },
        },
      },
      AnalysisMetrics: {
        type: "object",
        properties: {
          wordCount: { type: "integer", example: 420 },
          sentenceCount: { type: "integer", example: 22 },
          paragraphCount: { type: "integer", example: 9 },
          headingCount: { type: "integer", example: 5 },
          imageCount: { type: "integer", example: 3 },
          linkCount: { type: "integer", example: 14 },
          internalLinkCount: { type: "integer", example: 10 },
          externalLinkCount: { type: "integer", example: 4 },
          buttonCount: { type: "integer", example: 2 },
          listCount: { type: "integer", example: 1 },
          brokenInternalLinkCount: { type: "integer", example: 0 },
          hreflangCount: { type: "integer", example: 2 },
          structuredDataTypeCount: { type: "integer", example: 1 },
          validStructuredDataCount: { type: "integer", example: 1 },
          invalidStructuredDataCount: { type: "integer", example: 0 },
          isNoindex: { type: "boolean", example: false },
          hasXRobotsTag: { type: "boolean", example: false },
        },
      },
      Recommendation: {
        type: "object",
        properties: {
          id: { type: "string", example: "seo-meta-description" },
          category: { type: "string", enum: ["seo", "content", "ux"] },
          priority: { type: "string", enum: ["high", "medium", "low"] },
          message: { type: "string", example: "The meta description is missing." },
        },
      },
      AnalysisCheck: {
        type: "object",
        properties: {
          id: { type: "string", example: "seo-title" },
          category: { type: "string", enum: ["seo", "content", "ux"] },
          status: { type: "string", enum: ["good", "warning", "bad"] },
          score: { type: "integer", example: 5 },
          maxScore: { type: "integer", example: 10 },
          message: { type: "string", example: "The title is present but could be improved in length." },
          details: {
            type: "object",
            additionalProperties: true,
          },
        },
      },
      ReportSummary: {
        type: "object",
        properties: {
          strengths: {
            type: "array",
            items: { type: "string" },
          },
          issues: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
      AnalysisReport: {
        type: "object",
        properties: {
          locale: { type: "string", enum: ["en", "de"], example: "en" },
          url: { type: "string", format: "uri" },
          fetchedUrl: { type: "string", format: "uri" },
          analyzedAt: { type: "string", format: "date-time" },
          scores: { $ref: "#/components/schemas/ScoreBreakdown" },
          metrics: { $ref: "#/components/schemas/AnalysisMetrics" },
          summary: { $ref: "#/components/schemas/ReportSummary" },
          recommendations: {
            type: "array",
            items: { $ref: "#/components/schemas/Recommendation" },
          },
          checks: {
            type: "array",
            items: { $ref: "#/components/schemas/AnalysisCheck" },
          },
          performance: {
            anyOf: [{ $ref: "#/components/schemas/PerformanceReport" }, { type: "null" }],
          },
        },
      },
      PerformanceMetric: {
        type: "object",
        properties: {
          id: { type: "string", example: "largest-contentful-paint" },
          title: { type: "string", example: "Largest Contentful Paint" },
          displayValue: { type: "string", example: "2.1 s" },
          numericValue: { type: "number", example: 2100 },
        },
      },
      PerformanceReport: {
        type: "object",
        properties: {
          provider: { type: "string", example: "pagespeed-insights" },
          status: { type: "string", enum: ["available", "unavailable", "error"] },
          strategy: { type: "string", enum: ["mobile", "desktop"] },
          score: { anyOf: [{ type: "integer" }, { type: "null" }] },
          metrics: {
            type: "array",
            items: { $ref: "#/components/schemas/PerformanceMetric" },
          },
          fetchedAt: { type: "string", format: "date-time" },
          message: { type: "string" },
        },
      },
      SiteMetrics: {
        type: "object",
        properties: {
          crawledPages: { type: "integer", example: 10 },
          analyzedPages: { type: "integer", example: 9 },
          failedPages: { type: "integer", example: 1 },
          averageWordCount: { type: "integer", example: 260 },
          averageScore: { type: "integer", example: 73 },
          averagePerformanceScore: { anyOf: [{ type: "integer" }, { type: "null" }] },
          pagesWithPerformanceData: { type: "integer", example: 4 },
          duplicateTitleCount: { type: "integer", example: 2 },
          duplicateMetaDescriptionCount: { type: "integer", example: 1 },
          duplicateContentGroups: { type: "integer", example: 1 },
          thinContentPages: { type: "integer", example: 3 },
          canonicalClusterCount: { type: "integer", example: 1 },
          hreflangInconsistencyPages: { type: "integer", example: 2 },
          pagesWithLowMainContentShare: { type: "integer", example: 2 },
          pagesWithoutIncomingInternalLinks: { type: "integer", example: 2 },
          weaklyLinkedPages: { type: "integer", example: 3 },
          pagesWithoutH1: { type: "integer", example: 3 },
          pagesWithoutMetaDescription: { type: "integer", example: 4 },
          pagesWithLongParagraphIssues: { type: "integer", example: 2 },
          pagesWithoutCanonical: { type: "integer", example: 5 },
          noindexPages: { type: "integer", example: 2 },
          xRobotsTagPages: { type: "integer", example: 1 },
          hreflangPages: { type: "integer", example: 4 },
          structuredDataPages: { type: "integer", example: 3 },
          pagesWithInvalidStructuredData: { type: "integer", example: 1 },
          redirectedPages: { type: "integer", example: 1 },
          canonicalConflictPages: { type: "integer", example: 1 },
          pagesWithBrokenInternalLinks: { type: "integer", example: 2 },
          maxDepthReached: { type: "integer", example: 3 },
        },
      },
      SiteIssue: {
        type: "object",
        properties: {
          id: { type: "string", example: "site-missing-meta-description" },
          severity: { type: "string", enum: ["high", "medium", "low"] },
          message: { type: "string", example: "Multiple pages are missing a meta description." },
          affectedPages: {
            type: "array",
            items: { type: "string", format: "uri" },
          },
        },
      },
      CrawledPageResult: {
        type: "object",
        properties: {
          url: { type: "string", format: "uri" },
          depth: { type: "integer", example: 1 },
          status: { type: "string", enum: ["analyzed", "failed"] },
          pageMeta: {
            type: "object",
            nullable: true,
            properties: {
              title: { type: "string" },
              metaDescription: { type: "string" },
              canonical: { type: "string" },
              canonicalTarget: { type: "string", format: "uri" },
              requestedUrl: { type: "string", format: "uri" },
              fetchedUrl: { type: "string", format: "uri" },
              isNoindex: { type: "boolean" },
              xRobotsTag: { type: "string", example: "noindex, nofollow" },
              statusCode: { type: "integer", example: 200 },
              wasRedirected: { type: "boolean" },
              brokenInternalLinkCount: { type: "integer", example: 0 },
              hreflangCount: { type: "integer", example: 2 },
              structuredDataTypeCount: { type: "integer", example: 1 },
              invalidStructuredDataCount: { type: "integer", example: 0 },
              wordCount: { type: "integer", example: 240 },
              contentFingerprint: { type: "string", example: "example content fingerprint" },
              outgoingInternalUrls: {
                type: "array",
                items: { type: "string", format: "uri" },
              },
              hreflangValues: {
                type: "array",
                items: { type: "string", example: "de-DE" },
              },
              hreflangTargets: {
                type: "array",
                items: { type: "string", format: "uri" },
              },
              mainContentWordCount: { type: "integer", example: 180 },
              boilerplateWordCount: { type: "integer", example: 60 },
            },
          },
          report: {
            anyOf: [
              { $ref: "#/components/schemas/AnalysisReport" },
              { type: "null" },
            ],
          },
          error: {
            anyOf: [{ type: "string" }, { type: "null" }],
          },
        },
      },
      SiteAnalysisReport: {
        type: "object",
        properties: {
          locale: { type: "string", enum: ["en", "de"], example: "en" },
          url: { type: "string", format: "uri" },
          analyzedAt: { type: "string", format: "date-time" },
          crawl: {
            type: "object",
            properties: {
              maxPages: { type: "integer", example: 10 },
              crawledPages: { type: "integer", example: 8 },
              origin: { type: "string", format: "uri", example: "https://example.com" },
              blockedByRobots: { type: "integer", example: 2 },
              sitemapCount: { type: "integer", example: 1 },
              seededFromSitemaps: { type: "integer", example: 6 },
            },
          },
          scores: { $ref: "#/components/schemas/ScoreBreakdown" },
          metrics: { $ref: "#/components/schemas/SiteMetrics" },
          linkGraph: {
            type: "object",
            properties: {
              nodes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    url: { type: "string", format: "uri" },
                    incomingInternalLinks: { type: "integer", example: 2 },
                    outgoingInternalLinks: { type: "integer", example: 4 },
                    depth: { type: "integer", example: 1 },
                  },
                },
              },
              edgeCount: { type: "integer", example: 12 },
              pagesWithoutIncomingInternalLinks: {
                type: "array",
                items: { type: "string", format: "uri" },
              },
              weaklyLinkedPages: {
                type: "array",
                items: { type: "string", format: "uri" },
              },
              deepestPages: {
                type: "array",
                items: { type: "string", format: "uri" },
              },
            },
          },
          summary: { $ref: "#/components/schemas/ReportSummary" },
          recommendations: {
            type: "array",
            items: { $ref: "#/components/schemas/Recommendation" },
          },
          siteIssues: {
            type: "array",
            items: { $ref: "#/components/schemas/SiteIssue" },
          },
          pages: {
            type: "array",
            items: { $ref: "#/components/schemas/CrawledPageResult" },
          },
        },
      },
    },
  },
} as const;
