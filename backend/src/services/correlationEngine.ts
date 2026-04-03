// src/services/correlationEngine.ts
import { IEvent } from "../models/event.model";
import Event from "../models/event.model";
import ServiceDependency from "../models/serviceDependency.model";
import { CorrelationGroup, BestEffortGroup, processPipeline } from "./causalityPipeline";
import { randomUUID } from "crypto";
import logger from "../logger";

// ─── Configuration ─────────────────────────────────────────────────
const GROUP_CLOSE_TIMEOUT_MS = 15_000; // 15 seconds
const MAX_GROUP_SIZE = 100; // force close after 100 events
const FALLBACK_WINDOW_BEFORE_MS = 30_000; // 30 seconds before
const FALLBACK_WINDOW_AFTER_MS = 5_000; // 5 seconds after

// ─── In-memory group store ─────────────────────────────────────────
const groups = new Map<string, CorrelationGroup>();
const timers = new Map<string, NodeJS.Timeout>();

// ─── Public API ────────────────────────────────────────────────────

/**
 * Called on every event ingest.
 * If event has correlation_id → add to correlation group.
 * If event has no correlation_id and is a failure → run fallback.
 */
export function attachEvent(event: IEvent): void {
  if (event.correlation_id) {
    addToGroup(event);
  } else if (event.status === "error" || event.status === "timeout") {
    // Fire-and-forget fallback correlation
    handleFallbackCorrelation(event).catch((err) =>
      logger.error({ err, event_id: event.event_id }, "Fallback correlation failed")
    );
  }
  // If event has no correlation_id and status is ok → nothing to do
}

// ─── Correlation Grouping (§1) ─────────────────────────────────────

function addToGroup(event: IEvent): void {
  const cid = event.correlation_id!;

  let group = groups.get(cid);
  if (!group) {
    group = {
      correlation_id: cid,
      group_id: cid, // group_id = correlation_id when present
      events: [],
      last_event_at: new Date(),
      has_failure: false,
    };
    groups.set(cid, group);
  }

  group.events.push(event);
  group.last_event_at = new Date();

  if (event.status === "error" || event.status === "timeout") {
    group.has_failure = true;
  }

  // Check max group size → force close
  if (group.events.length >= MAX_GROUP_SIZE) {
    logger.info(
      { correlation_id: cid, size: group.events.length },
      "Group reached max size, force closing"
    );
    closeGroup(cid);
    return;
  }

  // Reset close timer (15 seconds of inactivity)
  resetTimer(cid);
}

function resetTimer(cid: string): void {
  const existing = timers.get(cid);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    closeGroup(cid);
  }, GROUP_CLOSE_TIMEOUT_MS);

  // Ensure timer doesn't prevent Node from exiting (for tests)
  if (timer && typeof timer === "object" && "unref" in timer) {
    timer.unref();
  }

  timers.set(cid, timer);
}

function closeGroup(cid: string): void {
  const group = groups.get(cid);
  if (!group) return;

  // Cleanup
  groups.delete(cid);
  const timer = timers.get(cid);
  if (timer) {
    clearTimeout(timer);
    timers.delete(cid);
  }

  // Trigger pipeline (fire-and-forget)
  processPipeline(group).catch((err) =>
    logger.error({ err, correlation_id: cid }, "Pipeline failed for group")
  );
}

// ─── Fallback Correlation (§2) ─────────────────────────────────────

async function handleFallbackCorrelation(event: IEvent): Promise<void> {
  const failedService = event.service;
  const failedAt = new Date(event.started_at).getTime();

  // Forward lookup: from_service → to_service
  const forwardDeps = await ServiceDependency.find({
    from_service: failedService,
  })
    .lean()
    .exec();
  const forwardServices = forwardDeps.map((d) => d.to_service);

  // Reverse lookup: to_service → from_service
  const reverseDeps = await ServiceDependency.find({
    to_service: failedService,
  })
    .lean()
    .exec();
  const reverseServices = reverseDeps.map((d) => d.from_service);

  // Union of both
  const relatedServices = [
    ...new Set([...forwardServices, ...reverseServices]),
  ].filter((s) => s !== failedService); // exclude self

  if (relatedServices.length === 0) {
    // No dependencies → single-event best-effort group
    const bestEffort: BestEffortGroup = {
      trigger_event: event,
      candidates: [],
      group_id: randomUUID(),
      confidence: "low",
    };
    await processPipeline(bestEffort);
    return;
  }

  // Query candidate failure events in the time window
  const windowStart = new Date(failedAt - FALLBACK_WINDOW_BEFORE_MS);
  const windowEnd = new Date(failedAt + FALLBACK_WINDOW_AFTER_MS);

  const candidates = await Event.find({
    service: { $in: relatedServices },
    status: { $in: ["error", "timeout"] },
    started_at: { $gte: windowStart, $lte: windowEnd },
  })
    .sort({ started_at: 1 })
    .limit(49) // + trigger = 50 max chain size
    .lean()
    .exec();

  const bestEffort: BestEffortGroup = {
    trigger_event: event,
    candidates: candidates as IEvent[],
    group_id: randomUUID(),
    confidence: "low",
  };

  await processPipeline(bestEffort);
}

// ─── Utilities (for testing) ───────────────────────────────────────

/** Returns current number of open groups (for testing/monitoring) */
export function getActiveGroupCount(): number {
  return groups.size;
}

/** Force-clear all groups and timers (for testing) */
export function _resetAll(): void {
  for (const [cid] of timers) {
    clearTimeout(timers.get(cid)!);
  }
  timers.clear();
  groups.clear();
}

/** Get a group by correlation_id (for testing) */
export function _getGroup(cid: string): CorrelationGroup | undefined {
  return groups.get(cid);
}
