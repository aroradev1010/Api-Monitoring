// sdk/src/track.ts
import { randomUUID } from "node:crypto";
import {
  getContext,
  createChildContext,
  runWithContext,
} from "./context";
import { getConfig, emit, isDisabled } from "./init";
import { SDK_VERSION } from "./version";
import type { EventPayload } from "./types";

/**
 * Wrap an async function with event tracking.
 *
 * - Creates a child context
 * - Runs `fn` inside AsyncLocalStorage
 * - Emits a "custom" event
 * - ALWAYS re-throws errors — SDK must never affect fn execution
 *
 * Usage:
 *   const result = await track("computeReport", async () => {
 *     // ... your logic
 *     return report;
 *   });
 */
export async function track<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  // ── If SDK is not ready, just run fn transparently ─────────────
  if (isDisabled()) {
    return fn();
  }

  let config: ReturnType<typeof getConfig>;
  try {
    config = getConfig();
  } catch {
    return fn();
  }

  const parentCtx = getContext();
  const startTime = Date.now();
  let childEventId: string;

  // ── Build child context ────────────────────────────────────────
  if (parentCtx) {
    const childCtx = createChildContext(parentCtx);
    childEventId = childCtx.currentEventId;

    let result: T;
    let error: unknown = null;

    try {
      result = await runWithContext(childCtx, fn);
    } catch (err) {
      error = err;
      throw err; // MUST re-throw
    } finally {
      const endTime = Date.now();
      const event: EventPayload = {
        event_id: childEventId,
        service: config.service,
        kind: "custom",
        operation,
        correlation_id: parentCtx.correlationId,
        parent_event_id: parentCtx.currentEventId,
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

    return result!;
  } else {
    // No parent context — emit with warning tag
    childEventId = randomUUID();

    let result: T;
    let error: unknown = null;

    try {
      result = await fn();
    } catch (err) {
      error = err;
      throw err;
    } finally {
      const endTime = Date.now();
      const event: EventPayload = {
        event_id: childEventId,
        service: config.service,
        kind: "custom",
        operation,
        correlation_id: null,
        parent_event_id: null,
        status: error ? "error" : "ok",
        latency_ms: endTime - startTime,
        error_code: error instanceof Error ? error.name : null,
        error_message: error instanceof Error ? error.message : null,
        started_at: new Date(startTime).toISOString(),
        ended_at: new Date(endTime).toISOString(),
        tags: {
          env: process.env.NODE_ENV || "unknown",
          service: config.service,
          _context_missing: "true",
        },
        sdk_version: SDK_VERSION,
        api_key: config.apiKey,
      };

      process.stderr.write(
        `[api-monitor-sdk] Warning: track("${operation}") called outside of a correlation context\n`
      );
      emit(event);
    }

    return result!;
  }
}
