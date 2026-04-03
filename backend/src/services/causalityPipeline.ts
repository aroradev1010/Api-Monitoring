// src/services/causalityPipeline.ts
import { IEvent } from "../models/event.model";
import Explanation from "../models/explanation.model";
import { buildChain } from "./causalChainBuilder";
import {
  classifyKind,
  determineConfidence,
  renderSummary,
  renderDetail,
  extractRootCause,
} from "./explanationGenerator";
import pubsub from "./pubsub";
import logger from "../logger";

export interface CorrelationGroup {
  correlation_id: string | null;
  group_id: string;
  events: IEvent[];
  last_event_at: Date;
  has_failure: boolean;
}

export interface BestEffortGroup {
  trigger_event: IEvent;
  candidates: IEvent[];
  group_id: string;
  confidence: "low";
}

/**
 * Full pipeline (§12):
 *  1. Build chain
 *  2. Assign roles (done inside buildChain)
 *  3. Classify
 *  4. Generate explanation
 *  5. Store explanation
 *  6. Emit via SSE
 *
 * Only generates explanation if the group has at least one failure.
 */
export async function processPipeline(
  group: CorrelationGroup | BestEffortGroup
): Promise<void> {
  try {
    // Determine events and metadata
    let events: IEvent[];
    let correlationId: string | null;
    let groupId: string;
    let hasCorrelationId: boolean;

    if ("trigger_event" in group) {
      // BestEffortGroup
      events = [group.trigger_event, ...group.candidates];
      correlationId = null;
      groupId = group.group_id;
      hasCorrelationId = false;
    } else {
      // CorrelationGroup
      if (!group.has_failure) {
        // §5 clarification: only generate if has_failure
        return;
      }
      events = group.events;
      correlationId = group.correlation_id;
      groupId = group.group_id;
      hasCorrelationId = correlationId !== null;
    }

    if (events.length === 0) return;

    // 1+2. Build chain (sorts + assigns roles)
    const chain = buildChain(events);
    if (chain.length === 0) return;

    // 3. Classify
    const kind = classifyKind(chain, hasCorrelationId);

    // 4. Generate explanation
    const rootCause = extractRootCause(chain);
    const affectedServices = [...new Set(chain.map((n) => n.service))];
    const { confidence, confidence_reason } =
      determineConfidence(hasCorrelationId);

    const summary = renderSummary(kind, rootCause, chain);
    const detail = renderDetail(kind, rootCause, chain, affectedServices);

    const timestamps = chain.map((n) => new Date(n.started_at).getTime());
    const failureStartedAt = new Date(Math.min(...timestamps));
    const failureEndedAt = new Date(Math.max(...timestamps));
    const totalDurationMs = failureEndedAt.getTime() - failureStartedAt.getTime();

    // 5. Store explanation
    const explanation = new Explanation({
      correlation_id: correlationId,
      group_id: groupId,
      event_ids: chain.map((n) => n.event_id),
      kind,
      confidence,
      confidence_reason,
      summary,
      detail,
      causal_chain: chain,
      root_cause: rootCause,
      affected_services: affectedServices,
      failure_started_at: failureStartedAt,
      failure_ended_at: failureEndedAt,
      total_duration_ms: totalDurationMs,
      event_count: chain.length,
    });

    const saved = await explanation.save();

    // 6. Emit via SSE
    try {
      pubsub.emit("explanation", saved.toObject());
    } catch (e) {
      logger.warn({ err: e }, "pubsub emit explanation failed");
    }

    logger.info(
      {
        explanation_id: saved.explanation_id,
        kind,
        confidence,
        event_count: chain.length,
        group_id: groupId,
      },
      "Explanation generated"
    );
  } catch (err) {
    logger.error({ err }, "Causality pipeline failed");
  }
}
