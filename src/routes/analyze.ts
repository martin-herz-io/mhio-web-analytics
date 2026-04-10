import { Router } from "express";
import { ZodError, z } from "zod";

import { appConfig } from "../config/env.js";
import { analyzeSite } from "../services/analyzeSite.js";
import { analyzeUrl } from "../services/analyzeUrl.js";

type HttpError = Error & { statusCode?: number };

const analyzeRequestSchema = z.object({
  url: z.url(),
  includePerformance: z.boolean().optional(),
  performanceStrategy: z.enum(["mobile", "desktop"]).optional(),
});

const analyzeSiteRequestSchema = z.object({
  url: z.url(),
  maxPages: z.number().int().min(1).max(appConfig.crawler.hardMaxPages).optional(),
  includePerformance: z.boolean().optional(),
  performanceStrategy: z.enum(["mobile", "desktop"]).optional(),
});

export const analyzeRouter = Router();

analyzeRouter.post("/", async (req, res, next) => {
  try {
    const { url, includePerformance, performanceStrategy } = analyzeRequestSchema.parse(req.body);
    const report = await analyzeUrl(url, { includePerformance, performanceStrategy });

    res.json(report);
  } catch (error) {
    if (error instanceof ZodError) {
      const validationError = new Error("Invalid request body") as HttpError;
      validationError.statusCode = 400;
      next(validationError);
      return;
    }

    next(error);
  }
});

analyzeRouter.post("/site", async (req, res, next) => {
  try {
    const { url, maxPages, includePerformance, performanceStrategy } = analyzeSiteRequestSchema.parse(req.body);
    const report = await analyzeSite(url, maxPages, { includePerformance, performanceStrategy });

    res.json(report);
  } catch (error) {
    if (error instanceof ZodError) {
      const validationError = new Error("Invalid request body") as HttpError;
      validationError.statusCode = 400;
      next(validationError);
      return;
    }

    next(error);
  }
});
