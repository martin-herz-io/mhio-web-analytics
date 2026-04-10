import { appConfig } from "../config/env.js";

type HttpError = Error & { statusCode?: number };

interface FetchTextOptions {
  accept: string;
  requireOk?: boolean;
  expectedContentTypes?: string[];
}

export interface FetchedPage {
  finalUrl: string;
  html: string;
  headers: {
    xRobotsTag: string;
  };
  statusCode: number;
  wasRedirected: boolean;
  redirectCount: number;
}

export interface FetchedTextResource {
  finalUrl: string;
  text: string;
  contentType: string;
  headers: {
    xRobotsTag: string;
  };
  statusCode: number;
  wasRedirected: boolean;
  redirectCount: number;
}

export async function fetchTextResource(url: string, options: FetchTextOptions): Promise<FetchedTextResource> {
  const response = await fetch(url, {
    headers: {
      "user-agent": appConfig.http.userAgent,
      accept: options.accept,
    },
    redirect: appConfig.crawler.followRedirects ? "follow" : "manual",
    signal: AbortSignal.timeout(appConfig.http.requestTimeoutMs),
  });

  if (options.requireOk !== false && !response.ok) {
    const error = new Error(`Failed to fetch resource: ${response.status}`) as HttpError;
    error.statusCode = 502;
    throw error;
  }

  const contentType = response.headers.get("content-type") || "";

  if (
    options.expectedContentTypes &&
    options.expectedContentTypes.length > 0 &&
    !options.expectedContentTypes.some((expectedType) => contentType.includes(expectedType))
  ) {
    const error = new Error(`Unexpected content type: ${contentType || "unknown"}`) as HttpError;
    error.statusCode = 422;
    throw error;
  }

  return {
    finalUrl: response.url,
    text: await response.text(),
    contentType,
    headers: {
      xRobotsTag: response.headers.get("x-robots-tag") || "",
    },
    statusCode: response.status,
    wasRedirected: response.redirected,
    redirectCount: response.redirected && response.url !== url ? 1 : 0,
  };
}

export async function fetchPage(url: string): Promise<FetchedPage> {
  const resource = await fetchTextResource(url, {
    accept: "text/html,application/xhtml+xml",
    expectedContentTypes: ["text/html"],
  });

  return {
    finalUrl: resource.finalUrl,
    html: resource.text,
    headers: {
      xRobotsTag: resource.headers.xRobotsTag,
    },
    statusCode: resource.statusCode,
    wasRedirected: resource.wasRedirected,
    redirectCount: resource.redirectCount,
  };
}
