// src/types/index.ts
export type Api = {
  api_id: string;
  name: string;
  base_url: string;
  probe_interval?: number;
  expected_status?: number[];
  created_at?: string;
};

export type Metric = {
  _id?: string;
  api_id: string;
  timestamp: string;
  latency_ms: number;
  status_code: number;
  error?: string | null;
  tags?: Record<string, any>;
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
