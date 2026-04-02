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
