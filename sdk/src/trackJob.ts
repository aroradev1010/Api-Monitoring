// sdk/src/trackJob.ts
import { randomUUID } from "node:crypto";
import { createRootContext, runWithContext, getContext } from "./context";
import { getConfig, emit, isDisabled } from "./init";
import { SDK_VERSION } from "./version";
import type { EventPayload } from "./types";

// ── trackJob() ─────────────────────────────────────────────────────

/**
 * Wrap a job processor function with event tracking.
 *
 * Extracts `_cid` (correlation ID) and `_parentEid` (parent event ID)
 * from the job data, creates a root context, and emits a job_execution event.
 *
 * Usage (e.g. with BullMQ):
 *   worker.process(trackJob(async (job) => {
 *     // job processing logic
 *   }));
 */
export function trackJob<TJob extends { data: Record<string, unknown> }>(
  handler: (job: TJob) => Promise<void>
): (job: TJob) => Promise<void> {
  return async (job: TJob): Promise<void> => {
    if (isDisabled()) {
      return handler(job);
    }

    let config: ReturnType<typeof getConfig>;
    try {
      config = getConfig();
    } catch {
      return handler(job);
    }

    // ── Extract propagated context from job data ─────────────────
    const cid = (job.data._cid as string) || null;
    const parentEid = (job.data._parentEid as string) || null;

    // ── Create root context (job = new root in the trace) ────────
    const ctx = createRootContext(config.service, cid);

    const startTime = Date.now();
    let error: unknown = null;

    try {
      await runWithContext(ctx, () => handler(job));
    } catch (err) {
      error = err;
      throw err; // MUST re-throw
    } finally {
      const endTime = Date.now();
      const event: EventPayload = {
        event_id: ctx.currentEventId,
        service: config.service,
        kind: "job_execution",
        operation: `job:${extractJobName(job)}`,
        correlation_id: ctx.correlationId,
        parent_event_id: parentEid,
        status: error ? "error" : "ok",
        latency_ms: endTime - startTime,
        error_code: error instanceof Error ? error.name : null,
        error_message: error instanceof Error ? error.message : null,
        started_at: new Date(startTime).toISOString(),
        ended_at: new Date(endTime).toISOString(),
        job: {
          queue: (job.data._queue as string) ?? null,
          attempt: (job.data._attempt as number) ?? 1,
          max_attempts: (job.data._maxAttempts as number) ?? 1,
        },
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

// ── enqueue() ──────────────────────────────────────────────────────

/**
 * Wrap a queue's add/enqueue function to inject correlation context
 * and emit a job_execution enqueue event.
 *
 * Usage:
 *   await enqueue("sendEmail", () => queue.add("sendEmail", payload));
 */
export async function enqueue<T>(
  jobName: string,
  addFn: (data: Record<string, unknown>) => Promise<T>,
  data: Record<string, unknown> = {}
): Promise<T> {
  if (isDisabled()) {
    return addFn(data);
  }

  let config: ReturnType<typeof getConfig>;
  try {
    config = getConfig();
  } catch {
    return addFn(data);
  }

  const parentCtx = getContext();
  const eventId = randomUUID();

  // ── Inject correlation context into job data ───────────────────
  const enrichedData: Record<string, unknown> = {
    ...data,
    _cid: parentCtx?.correlationId ?? null,
    _parentEid: parentCtx?.currentEventId ?? null,
  };

  const startTime = Date.now();
  let error: unknown = null;
  let result: T;

  try {
    result = await addFn(enrichedData);
  } catch (err) {
    error = err;
    throw err;
  } finally {
    const endTime = Date.now();
    const event: EventPayload = {
      event_id: eventId,
      service: config.service,
      kind: "job_execution",
      operation: `enqueue:${jobName}`,
      correlation_id: parentCtx?.correlationId ?? null,
      parent_event_id: parentCtx?.currentEventId ?? null,
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
}

// ── Helpers ────────────────────────────────────────────────────────

function extractJobName(job: { data: Record<string, unknown> }): string {
  return (job.data._jobName as string) ?? "unknown";
}
