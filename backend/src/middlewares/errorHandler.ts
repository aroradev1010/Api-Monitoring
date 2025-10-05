// src/middlewares/errorHandler.ts
import { NextFunction, Request, Response } from "express";
import config from "../config";

/**
 * Generic error handling middleware. Use app.use(errorHandler) at the end.
 * Produces JSON responses with shape: { error: string }
 */
export default function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // optional: more structured logging can go here (winston/pino)
  if (config.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.error("Unhandled error:", err);
  } else {
    // In production you would log to a file or external service
  }

  const status =
    err.status && typeof err.status === "number" ? err.status : 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ error: message });
}
