// sdk/src/trackExpress.ts
import type { Request, Response, NextFunction, RequestHandler } from "express";
import {
  createRootContext,
  runWithContext,
  getContext,
} from "./context";
import { getConfig, emit } from "./init";
import { SDK_VERSION } from "./version";
import type { EventPayload } from "./types";

/**
 * Express middleware that:
 * 1. Creates a root CorrelationContext for each incoming request
 * 2. Runs the rest of the middleware/route chain inside AsyncLocalStorage
 * 3. On response finish, emits an http_request event
 *
 * Must be registered BEFORE routes:
 *   app.use(trackExpress())
 */
export function trackExpress(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    let config: ReturnType<typeof getConfig>;
    try {
      config = getConfig();
    } catch {
      // SDK not initialized — pass through silently
      next();
      return;
    }

    if (config.disabled) {
      next();
      return;
    }

    // ── Read correlation ID from upstream caller ──────────────────
    const incomingCid =
      (req.headers["x-correlation-id"] as string | undefined) || null;
    const incomingParentEventId =
      (req.headers["x-parent-event-id"] as string | undefined) || null;

    // ── Create root context ──────────────────────────────────────
    const ctx = createRootContext(config.service, incomingCid);

    const startTime = Date.now();

    // ── Emit event on response finish ────────────────────────────
    res.once("finish", () => {
      const endTime = Date.now();
      const currentCtx = getContext();

      const event: EventPayload = {
        event_id: ctx.currentEventId,
        service: config.service,
        kind: "http_request",
        operation: `${req.method} ${req.route?.path ?? req.path}`,
        correlation_id: ctx.correlationId,
        parent_event_id: incomingParentEventId,
        status: res.statusCode >= 400 ? "error" : "ok",
        latency_ms: endTime - startTime,
        error_code: res.statusCode >= 400 ? String(res.statusCode) : null,
        error_message: null,
        started_at: new Date(startTime).toISOString(),
        ended_at: new Date(endTime).toISOString(),
        http: {
          method: req.method,
          path: req.route?.path ?? req.path,
          status_code: res.statusCode,
          target_url: `${req.protocol}://${req.get("host")}${req.originalUrl}`,
        },
        tags: {
          env: process.env.NODE_ENV || "unknown",
          service: config.service,
          ...(currentCtx
            ? {}
            : { _context_missing: "true" }),
        },
        sdk_version: SDK_VERSION,
        api_key: config.apiKey,
      };

      emit(event);
    });

    // ── Run the rest of the request in ALS ───────────────────────
    runWithContext(ctx, () => {
      next();
    });
  };
}
