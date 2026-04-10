import express, { type NextFunction, type Request, type Response } from "express";
import swaggerUi from "swagger-ui-express";

import { appConfig } from "./config/env.js";
import { openApiDocument } from "./docs/openapi.js";
import { analyzeRouter } from "./routes/analyze.js";

type HttpError = Error & { statusCode?: number };

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

  app.use((err: HttpError, _req: Request, res: Response, _next: NextFunction) => {
    const statusCode = err.statusCode || 500;

    res.status(statusCode).json({
      error: err.message || "Internal Server Error",
    });
  });

  return app;
}
