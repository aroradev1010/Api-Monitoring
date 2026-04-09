// sdk/src/context.ts
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { CorrelationContext } from "./types";

/**
 * Single AsyncLocalStorage instance for the entire SDK.
 * Context is NEVER exposed directly — only through safe accessors.
 */
const als = new AsyncLocalStorage<CorrelationContext>();

// ── Context Factories ──────────────────────────────────────────────

/**
 * Create a root context (HTTP request entry / cron invocation).
 * If an existing correlationId is provided (e.g. from X-Correlation-ID),
 * it is reused; otherwise a new UUID is generated.
 */
export function createRootContext(
  service: string,
  existingCorrelationId?: string | null
): CorrelationContext {
  return Object.freeze({
    correlationId: existingCorrelationId || randomUUID(),
    currentEventId: randomUUID(),
    service,
    depth: 0,
  });
}

/**
 * Derive a child context from a parent.
 * NEVER mutates parent — always returns a new frozen object.
 */
export function createChildContext(
  parent: CorrelationContext
): CorrelationContext {
  return Object.freeze({
    correlationId: parent.correlationId,
    currentEventId: randomUUID(),
    service: parent.service,
    depth: parent.depth + 1,
  });
}

// ── Safe Access ────────────────────────────────────────────────────

/**
 * Returns the current CorrelationContext, or null if none is active.
 * All SDK emitters MUST use this instead of accessing ALS directly.
 */
export function getContext(): CorrelationContext | null {
  return als.getStore() ?? null;
}

// ── Runner ─────────────────────────────────────────────────────────

/**
 * Execute `fn` within the given CorrelationContext.
 */
export function runWithContext<T>(
  ctx: CorrelationContext,
  fn: () => T
): T {
  return als.run(ctx, fn);
}
