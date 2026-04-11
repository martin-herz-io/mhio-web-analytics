import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import express, { type NextFunction, type Request, type Response } from "express";
import swaggerUi from "swagger-ui-express";

import { appConfig } from "./config/env.js";
import { openApiDocument } from "./docs/openapi.js";
import { analyzeRouter } from "./routes/analyze.js";

type HttpError = Error & { statusCode?: number };

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectoryPath = path.dirname(currentFilePath);
const webAppBuildDirectoryPath = path.resolve(currentDirectoryPath, "../public/app");
const webAppIndexFilePath = path.join(webAppBuildDirectoryPath, "index.html");

export function createApp() {
  const app = express();

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/openapi.json", (_req, res) => {
    res.json(openApiDocument);
  });

  if (appConfig.docs.enabled) {
    app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
  }

  app.use("/analyze", analyzeRouter);

  if (fs.existsSync(webAppBuildDirectoryPath)) {
    app.use(express.static(webAppBuildDirectoryPath));

    app.get(/^(?!\/analyze|\/docs|\/openapi\.json|\/health).*/, (_req, res) => {
      if (fs.existsSync(webAppIndexFilePath)) {
        res.sendFile(webAppIndexFilePath);
      } else {
        res.status(404).json({ error: "Frontend build not found" });
      }
    });
  }

  app.use((err: HttpError, _req: Request, res: Response, _next: NextFunction) => {
    const statusCode = err.statusCode || 500;

    res.status(statusCode).json({
      error: err.message || "Internal Server Error",
    });
  });

  return app;
}
