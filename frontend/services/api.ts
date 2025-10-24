// src/services/api.ts

import { Alert, Api, Metric, Rule } from "@/types";

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

async function handleRes<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Request failed (${res.status}) ${text}`);
  }
  return (await res.json()) as T;
}

// APIs
export async function listApis(): Promise<Api[]> {
  const res = await fetch(`${BASE}/v1/apis`);
  return handleRes<Api[]>(res);
}
export async function createApi(payload: Partial<Api>): Promise<Api> {
  const res = await fetch(`${BASE}/v1/apis`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleRes<Api>(res);
}
export async function deleteApi(api_id: string): Promise<void> {
  await fetch(`${BASE}/v1/apis/${encodeURIComponent(api_id)}`, {
    method: "DELETE",
  });
}

// Metrics
export async function getMetrics(
  api_id: string,
  limit = 30
): Promise<Metric[]> {
  const res = await fetch(
    `${BASE}/v1/metrics?api_id=${encodeURIComponent(api_id)}&limit=${limit}`
  );
  return handleRes<Metric[]>(res);
}
export async function postMetricSynthetic(api_id: string): Promise<Metric> {
  const payload: Partial<Metric> = {
    api_id,
    timestamp: new Date().toISOString(),
    latency_ms: Math.floor(Math.random() * 1200),
    status_code: 200,
    error: null,
    tags: { manual: true },
  };
  const res = await fetch(`${BASE}/v1/metrics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleRes<Metric>(res);
}

// Alerts
export async function listAlerts(opts?: {
  api_id?: string;
  state?: string;
  limit?: number;
}): Promise<Alert[]> {
  const q = new URLSearchParams();
  if (opts?.api_id) q.set("api_id", opts.api_id);
  if (opts?.state) q.set("state", opts.state);
  if (opts?.limit) q.set("limit", String(opts.limit));
  const res = await fetch(`${BASE}/v1/alerts?${q.toString()}`);
  return handleRes<Alert[]>(res);
}

// Rules
export async function listRules(api_id?: string): Promise<Rule[]> {
  const q = api_id ? `?api_id=${encodeURIComponent(api_id)}` : "";
  const res = await fetch(`${BASE}/v1/rules${q}`);
  return handleRes<Rule[]>(res);
}
export async function createRule(payload: Partial<Rule>) {
  const res = await fetch(`${BASE}/v1/rules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleRes(res);
}
export async function deleteRule(rule_id: string) {
  await fetch(`${BASE}/v1/rules/${encodeURIComponent(rule_id)}`, {
    method: "DELETE",
  });
}
