// src/services/causalChainBuilder.ts
import { IEvent } from "../models/event.model";
import { ICausalChainNode, EventRole } from "../models/explanation.model";

const MAX_CHAIN_SIZE = 50;

/**
 * Build a causal chain from a set of events.
 * - Sorts by started_at ASC
 * - Links via parent_event_id if present, else to previous event
 * - Assigns roles per Decision 2 §5
 */
export function buildChain(events: IEvent[]): ICausalChainNode[] {
  if (!events || events.length === 0) return [];

  // Sort by started_at ascending, cap at MAX_CHAIN_SIZE
  const sorted = [...events]
    .sort(
      (a, b) =>
        new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
    )
    .slice(0, MAX_CHAIN_SIZE);

  // Find the index of the first failure event (root cause)
  const rootIdx = sorted.findIndex(
    (e) => e.status === "error" || e.status === "timeout"
  );

  const nodes: ICausalChainNode[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const e = sorted[i];
    const role = assignRole(i, rootIdx, e);

    // Determine linked_to: parent_event_id if present, else previous event_id
    let linkedTo: string | null = null;
    if (e.parent_event_id) {
      linkedTo = e.parent_event_id;
    } else if (i > 0) {
      linkedTo = sorted[i - 1].event_id;
    }

    nodes.push({
      event_id: e.event_id,
      service: e.service,
      operation: e.operation,
      status: e.status,
      latency_ms: e.latency_ms,
      started_at: e.started_at,
      error_code: e.error_code ?? null,
      error_message: e.error_message ?? null,
      role,
      parent_event_id: e.parent_event_id ?? null,
      linked_to: linkedTo,
    });
  }

  return nodes;
}

/**
 * Role assignment per Decision 2 §5 (MANDATORY RULES):
 *   - First failure event → root_cause
 *   - Events AFTER root failure:
 *       status !== ok → propagation
 *       status === ok → consequence
 *   - Events BEFORE root → context
 */
function assignRole(
  index: number,
  rootIdx: number,
  event: IEvent
): EventRole {
  // No failure found at all — everything is context
  if (rootIdx === -1) return "context";

  if (index === rootIdx) return "root_cause";
  if (index < rootIdx) return "context";

  // index > rootIdx
  if (event.status !== "ok") return "propagation";
  return "consequence";
}
