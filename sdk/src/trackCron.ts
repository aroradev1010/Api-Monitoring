// sdk/src/trackCron.ts
import { randomUUID } from "node:crypto";
import { createRootContext, runWithContext } from "./context";
import { getConfig, emit, isDisabled } from "./init";
import { SDK_VERSION } from "./version";
import type { EventPayload } from "./types";

/**
 * Wrap a cron job function with event tracking.
 *
 * ALWAYS creates a new correlationId (cron = new independent trace).
 * parent_event_id is ALWAYS null.
 *
 * Usage:
 *   cron.schedule("0 * * * *", trackCron("cleanupExpired", async () => {
 *     // cron logic
 *   }));
 */
export function trackCron(
  operation: string,
  fn: () => Promise<void>
): () => Promise<void> {
  return async (): Promise<void> => {
    if (isDisabled()) {
      return fn();
    }

    let config: ReturnType<typeof getConfig>;
    try {
      config = getConfig();
    } catch {
      return fn();
    }

    // ── Always new correlation — cron starts a fresh trace ────────
    const ctx = createRootContext(config.service);

    const startTime = Date.now();
    let error: unknown = null;

    try {
      await runWithContext(ctx, fn);
    } catch (err) {
      error = err;
      throw err; // re-throw
    } finally {
      const endTime = Date.now();
      const event: EventPayload = {
        event_id: ctx.currentEventId,
        service: config.service,
        kind: "cron_execution",
        operation,
        correlation_id: ctx.correlationId,
        parent_event_id: null, // ALWAYS null for cron
        status: error ? "error" : "ok",
        latency_ms: endTime - startTime,
        error_code: error instanceof Error ? error.name : null,
        error_message: error instanceof Error ? error.message : null,
        started_at: new Date(startTime).toISOString(),
        ended_at: new Date(endTime).toISOString(),
        tags: {
          env: process.env.NODE_ENV || "unknown",
          service: config.service,
        },
        sdk_version: SDK_VERSION,
        api_key: config.apiKey,
      };

      emit(event);
    }
  };
}
