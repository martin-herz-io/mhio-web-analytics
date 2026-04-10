[![mhio Web Analytics - API-first Technical SEO Site Auditor](https://repository-images.githubusercontent.com/1207343392/633783a1-fe37-4e74-a036-81b8e70975e4)](https://github.com/martin-herz-io/mhio-web-analytics)

[![Node.js](https://img.shields.io/badge/node-%3E%3D22-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-6.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/express-5.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![OpenAPI](https://img.shields.io/badge/openapi-3.1-6BA539?logo=openapiinitiative&logoColor=white)](https://spec.openapis.org/oas/latest.html)
[![Docker](https://img.shields.io/badge/docker-ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![License: Apache 2.0](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](./LICENSE)

API-first open source website analyzer for SEO, content quality, UX heuristics, and sitewide crawling.

`mhio Web Analytics` is built to inspect websites programmatically and return structured JSON reports that can be consumed by dashboards, CI jobs, internal tooling, or future web interfaces. The project currently focuses on technical SEO, content flow heuristics, sitewide crawl insights, and optional performance enrichment via Google PageSpeed Insights.

## Features

- Single-page analysis via JSON API
- Sitewide crawling for internal links on the same domain
- SEO audits for titles, meta descriptions, headings, canonicals, `noindex`, `hreflang`, structured data, and more
- Content and UX heuristics such as long paragraphs, heading distribution, thin content, boilerplate-heavy pages, and weak CTA structure
- Site-level signals for duplicate titles, duplicate content, broken internal links, canonical clusters, and internal linking quality
- Optional Google PageSpeed Insights integration
- Swagger UI and OpenAPI JSON for API discovery
- Docker-ready runtime for local and server deployment
- TypeScript codebase with tests via Vitest

## Current Endpoints

- `GET /health`
- `GET /docs`
- `GET /openapi.json`
- `POST /analyze`
- `POST /analyze/site`

## Tech Stack

- Node.js
- TypeScript
- Express
- Zod
- Cheerio
- Swagger UI Express
- Vitest
- Docker

## Quick Start

### Requirements

- Node.js 22 or newer
- npm

### Installation

```bash
npm install
cp .env.example .env
```

### Development

```bash
npm run dev
```

The API will be available at `http://localhost:3000` by default.

### Build

```bash
npm run build
npm start
```

### Test

```bash
npm test
```

## Docker

Environment variables:

```bash
cp .env.example .env
```

`docker-compose.yml` already loads `.env.example` as defaults and applies `.env` as optional overrides.

Run with Docker Compose:

```bash
docker compose up --build
```

Run detached:

```bash
docker compose up --build -d
```

Stop the stack:

```bash
docker compose down
```

The service receives all runtime variables via `env_file` from `.env.example` and optional `.env` overrides.

## Configuration

Runtime configuration is managed via environment variables. A detailed starter configuration is available in [.env.example](./.env.example).

Important options include:

- `MHIO_HTTP_USER_AGENT` to define a custom crawler user agent
- `MHIO_HTTP_TIMEOUT_MS` to control request timeouts
- `MHIO_CRAWLER_DEFAULT_MAX_PAGES` and `MHIO_CRAWLER_HARD_MAX_PAGES` to control crawl size
- `MHIO_CRAWLER_CONCURRENCY` to adjust parallel crawl workers
- `MHIO_BROKEN_LINK_CHECK_METHOD` to switch between `HEAD` and `GET`
- `MHIO_PAGESPEED_DEFAULT_ENABLED` and `MHIO_PAGESPEED_STRATEGY` for performance defaults
- `MHIO_DOCS_ENABLED` to enable or disable Swagger UI

## API Examples

### Analyze a Single Page

```bash
curl -X POST http://localhost:3000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "includePerformance": false
  }'
```

### Analyze a Site

```bash
curl -X POST http://localhost:3000/analyze/site \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "maxPages": 10,
    "includePerformance": false
  }'
```

### Example Response Shape

```json
{
  "url": "https://example.com/",
  "scores": {
    "overall": 78,
    "seo": 82,
    "content": 74,
    "ux": 71
  },
  "summary": {
    "strengths": [
      "Core SEO metadata is present"
    ],
    "issues": [
      "Several long paragraphs reduce scanability"
    ]
  },
  "recommendations": [
    {
      "id": "content-long-paragraphs",
      "category": "content",
      "priority": "medium",
      "message": "Split very long paragraphs into shorter sections."
    }
  ]
}
```

## API Documentation

Interactive Swagger UI is available at:

- [`/docs`](http://localhost:3000/docs)

Raw OpenAPI schema is available at:

- [`/openapi.json`](http://localhost:3000/openapi.json)

## Analysis Coverage

The project currently includes checks and heuristics in areas such as:

- Titles, meta descriptions, canonicals, heading structure, image `alt` coverage
- `meta robots`, `x-robots-tag`, redirects, status codes, broken internal links
- `hreflang`, JSON-LD structured data, and baseline structured data validation
- Duplicate titles, duplicate content, thin content, and canonical clusters
- Link graph depth, weak internal linking, and pages without incoming internal links
- Text flow heuristics such as paragraph length, content density, and boilerplate dominance
- Optional PageSpeed Insights performance data

## Project Structure

```text
src/
  analyzers/
  config/
  docs/
  routes/
  scoring/
  services/
  types/
tests/
Dockerfile
.env.example
```

## Roadmap Ideas

- Historical crawl comparisons
- Persistence layer for report storage
- Export formats such as CSV or HTML reports
- More advanced structured data validation
- Better visual design heuristics and rendered-page analysis
- Authentication and multi-tenant API usage

## Contributing

Contributions, issues, and ideas are welcome. If you want to extend the analyzer, improve heuristic quality, add new rules, or expand Docker and deployment support, feel free to open an issue or submit a pull request.

## License

This project is licensed under the Apache License 2.0.
