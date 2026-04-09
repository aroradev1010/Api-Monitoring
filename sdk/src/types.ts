// sdk/src/types.ts

// ── SDK Configuration ──────────────────────────────────────────────

export interface SDKConfig {
  /** API key used to authenticate with the ingest backend */
  apiKey: string;

  /** Logical service name (must match a registered API in the backend) */
  service: string;

  /** Base URL of the ingest backend. Default: "http://localhost:4000" */
  ingestUrl?: string;

  /** How often (ms) to flush the event buffer. Default: 2000 */
  flushIntervalMs?: number;

  /** Enable debug logging to stderr. Default: false */
  debug?: boolean;

  /** Disable all event emission (SDK becomes a no-op). Default: false */
  disabled?: boolean;
}

/** Resolved (all-required) version of SDKConfig */
export interface ResolvedConfig {
  apiKey: string;
  service: string;
  ingestUrl: string;
  flushIntervalMs: number;
  debug: boolean;
  disabled: boolean;
}

// ── Correlation Context ────────────────────────────────────────────

export interface CorrelationContext {
  readonly correlationId: string;
  readonly currentEventId: string;
  readonly service: string;
  readonly depth: number;
}

// ── Event types ────────────────────────────────────────────────────

export type EventKind =
  | "http_request"
  | "job_execution"
  | "cron_execution"
  | "custom";

export type EventStatus = "ok" | "error" | "timeout";

export interface EventHttpData {
  method: string;
  path: string;
  status_code: number;
  target_url: string;
}

export interface EventJobData {
  queue: string | null;
  attempt: number;
  max_attempts: number;
}

export interface EventPayload {
  event_id: string;
  service: string;
  kind: EventKind;
  operation: string;

  correlation_id: string | null;
  parent_event_id: string | null;

  status: EventStatus;
  latency_ms: number;
  error_code: string | null;
  error_message: string | null;

  started_at: string; // ISO-8601
  ended_at: string;   // ISO-8601

  http?: EventHttpData;
  job?: EventJobData;

  tags: Record<string, string>;
  sdk_version: string;
  api_key: string;
}
