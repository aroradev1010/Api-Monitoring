// src/types/index.ts

export type Api = {
  api_id: string;
  name: string;
  base_url: string;
  probe_interval?: number;
  expected_status?: number[];
  created_at?: string;
};

export type Event = {
  _id?: string;
  event_id?: string;
  service: string;
  kind: "http_request" | "job_execution" | "cron_execution" | "custom";
  operation: string;
  correlation_id?: string | null;
  parent_event_id?: string | null;
  status: "ok" | "error" | "timeout";
  latency_ms: number;
  error_code?: string | null;
  error_message?: string | null;
  started_at: string;
  ended_at: string;
  http?: {
    method: string;
    path: string;
    status_code: number;
    target_url: string;
  };
  job?: {
    queue: string | null;
    attempt: number;
    max_attempts: number;
  };
  tags?: Record<string, string>;
  received_at?: string;
  sdk_version?: string | null;
  api_key?: string;
};

export type Alert = {
  _id?: string;
  rule_id: string;
  api_id: string;
  created_at: string;
  state: "triggered" | "resolved";
  payload?: any;
  timestamp?: string;
};

export type Rule = {
  rule_id: string;
  name: string;
  api_id: string | null;
  type: string;
  threshold?: number | number[];
};

// ─── Causality Engine Types ────────────────────────────────────────

export type EventRole = "root_cause" | "propagation" | "consequence" | "context";
export type ExplanationKind =
  | "single_failure"
  | "upstream_caused"
  | "cascade"
  | "timeout_chain"
  | "unresolved";

export type CausalChainNode = {
  event_id: string;
  service: string;
  operation: string;
  status: string;
  latency_ms: number;
  started_at: string;
  error_code: string | null;
  error_message: string | null;
  role: EventRole;
  parent_event_id: string | null;
  linked_to: string | null;
};

export type Explanation = {
  _id?: string;
  explanation_id: string;
  correlation_id: string | null;
  group_id: string;
  event_ids: string[];
  kind: ExplanationKind;
  confidence: "high" | "low";
  confidence_reason: string;
  summary: string;
  detail: string;
  causal_chain: CausalChainNode[];
  root_cause: {
    service: string;
    operation: string;
    status: string;
    error_code: string | null;
    error_message: string | null;
    latency_ms: number;
    started_at: string;
  } | null;
  affected_services: string[];
  failure_started_at: string;
  failure_ended_at: string | null;
  total_duration_ms: number | null;
  created_at: string;
  event_count: number;
};

export type ServiceDependency = {
  _id?: string;
  from_service: string;
  to_service: string;
  relationship: "http_call" | "enqueues" | "reads_from";
  description: string | null;
  declared_by: "user" | "suggested_confirmed";
  created_at?: string;
  updated_at?: string;
};

export type ServiceInfo = {
  _id?: string;
  name: string;
  kind: "api" | "worker" | "cron" | "unknown";
  first_seen_at: string;
  last_seen_at: string;
  event_count: number;
};
