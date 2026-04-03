// src/services/explanationGenerator.ts
import {
  ExplanationKind,
  ICausalChainNode,
  IRootCause,
} from "../models/explanation.model";

// ─── Classification (§7) ───────────────────────────────────────────

export function classifyKind(
  chain: ICausalChainNode[],
  hasCorrelationId: boolean
): ExplanationKind {
  const failures = chain.filter(
    (n) => n.status === "error" || n.status === "timeout"
  );
  const failedServices = new Set(failures.map((f) => f.service));
  const allTimeouts = failures.length > 0 && failures.every((f) => f.status === "timeout");

  if (failures.length === 0) return "unresolved";

  // All failures are timeouts → timeout_chain
  if (allTimeouts && failures.length >= 2) return "timeout_chain";

  // Single failure, single service
  if (failures.length === 1 && failedServices.size === 1) return "single_failure";

  // Root cause service differs from other failed services
  const rootNode = chain.find((n) => n.role === "root_cause");
  if (rootNode && failedServices.size >= 2) {
    const otherFailedServices = new Set(
      failures.filter((f) => f.service !== rootNode.service).map((f) => f.service)
    );
    if (otherFailedServices.size > 0) {
      // Cascade: ≥3 distinct failed services
      if (failedServices.size >= 3) return "cascade";
      return "upstream_caused";
    }
  }

  // Cascade: failures across many services
  if (failedServices.size >= 3) return "cascade";

  // Multiple failures in same service or 2 services
  if (failures.length > 1) return "upstream_caused";

  return "unresolved";
}

// ─── Confidence (§8) ───────────────────────────────────────────────

export function determineConfidence(hasCorrelationId: boolean): {
  confidence: "high" | "low";
  confidence_reason: string;
} {
  if (hasCorrelationId) {
    return {
      confidence: "high",
      confidence_reason: "Events linked by explicit correlation_id",
    };
  }
  return {
    confidence: "low",
    confidence_reason:
      "Correlated via fallback heuristic (time window + service dependencies)",
  };
}

// ─── Template Renderer (§9) ────────────────────────────────────────

export function renderSummary(
  kind: ExplanationKind,
  rootCause: IRootCause | null,
  chain: ICausalChainNode[]
): string {
  const svc = rootCause?.service ?? "unknown";
  const op = rootCause?.operation ?? "unknown";
  const errMsg = rootCause?.error_message
    ? `: ${rootCause.error_message.slice(0, 60)}`
    : "";
  const failCount = chain.filter(
    (n) => n.status === "error" || n.status === "timeout"
  ).length;

  switch (kind) {
    case "single_failure":
      return truncate(
        `Single failure in ${svc} at ${op}${errMsg}`,
        160
      );
    case "upstream_caused":
      return truncate(
        `Failure in ${svc} caused downstream impact (${failCount} events affected)`,
        160
      );
    case "cascade":
      return truncate(
        `Cascade failure originating from ${svc}, affecting ${failCount} events across multiple services`,
        160
      );
    case "timeout_chain":
      return truncate(
        `Timeout chain starting at ${svc} — ${failCount} timeouts detected`,
        160
      );
    case "unresolved":
      return truncate(
        `Unresolved failure pattern involving ${svc} (${failCount} events)`,
        160
      );
    default:
      return truncate(`Failure detected in ${svc}`, 160);
  }
}

export function renderDetail(
  kind: ExplanationKind,
  rootCause: IRootCause | null,
  chain: ICausalChainNode[],
  affectedServices: string[]
): string {
  const svc = rootCause?.service ?? "unknown";
  const op = rootCause?.operation ?? "unknown";
  const status = rootCause?.status ?? "unknown";
  const errCode = rootCause?.error_code ?? "none";
  const errMsg = rootCause?.error_message ?? "no error message";
  const latency = rootCause?.latency_ms ?? 0;
  const failures = chain.filter(
    (n) => n.status === "error" || n.status === "timeout"
  );
  const propagations = chain.filter((n) => n.role === "propagation");

  const lines: string[] = [];

  lines.push(`## Root Cause`);
  lines.push(`- **Service**: ${svc}`);
  lines.push(`- **Operation**: ${op}`);
  lines.push(`- **Status**: ${status}`);
  lines.push(`- **Error code**: ${errCode}`);
  lines.push(`- **Error message**: ${errMsg}`);
  lines.push(`- **Latency**: ${latency}ms`);
  lines.push(``);

  if (propagations.length > 0) {
    lines.push(`## Propagation`);
    for (const p of propagations) {
      lines.push(
        `- ${p.service}/${p.operation}: ${p.status} (${p.latency_ms}ms)${p.error_message ? " — " + p.error_message : ""}`
      );
    }
    lines.push(``);
  }

  lines.push(`## Impact`);
  lines.push(`- **Total failures**: ${failures.length}`);
  lines.push(`- **Affected services**: ${affectedServices.join(", ") || "none"}`);
  lines.push(`- **Classification**: ${kind}`);

  return lines.join("\n");
}

// ─── Root cause extraction ─────────────────────────────────────────

export function extractRootCause(chain: ICausalChainNode[]): IRootCause | null {
  const rootNode = chain.find((n) => n.role === "root_cause");
  if (!rootNode) return null;
  return {
    service: rootNode.service,
    operation: rootNode.operation,
    status: rootNode.status,
    error_code: rootNode.error_code,
    error_message: rootNode.error_message,
    latency_ms: rootNode.latency_ms,
    started_at: rootNode.started_at,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 3) + "...";
}
