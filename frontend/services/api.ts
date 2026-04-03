// src/services/api.ts

import { Alert, Api, Event, Explanation, Rule, ServiceDependency, ServiceInfo } from "@/types";

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

// Events
export async function getEvents(
  service: string,
  limit = 30
): Promise<Event[]> {
  const res = await fetch(
    `${BASE}/v1/events?service=${encodeURIComponent(service)}&limit=${limit}`
  );
  return handleRes<Event[]>(res);
}

export async function postProbe(api_id: string, timeout = 10000) {
  const res = await fetch(`${BASE}/v1/probe/${encodeURIComponent(api_id)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ timeout }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => null);
    throw new Error(`Probe failed (${res.status}): ${body ?? ""}`);
  }
  const json = await res.json();
  return json;
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

// ─── Explanations ──────────────────────────────────────────────────

export async function getExplanations(
  service?: string,
  limit = 20
): Promise<Explanation[]> {
  const q = new URLSearchParams();
  if (service) q.set("service", service);
  q.set("limit", String(limit));
  const res = await fetch(`${BASE}/v1/explanations?${q.toString()}`);
  return handleRes<Explanation[]>(res);
}

export async function getExplanationById(id: string): Promise<Explanation> {
  const res = await fetch(
    `${BASE}/v1/explanations/${encodeURIComponent(id)}`
  );
  return handleRes<Explanation>(res);
}

export async function getLatestExplanation(
  service: string
): Promise<Explanation> {
  const res = await fetch(
    `${BASE}/v1/explanations/latest?service=${encodeURIComponent(service)}`
  );
  return handleRes<Explanation>(res);
}

// ─── Dependencies ──────────────────────────────────────────────────

export async function getDependencies(
  service?: string
): Promise<ServiceDependency[]> {
  const q = service ? `?service=${encodeURIComponent(service)}` : "";
  const res = await fetch(`${BASE}/v1/dependencies${q}`);
  return handleRes<ServiceDependency[]>(res);
}

export async function createDependency(
  payload: Partial<ServiceDependency>
): Promise<ServiceDependency> {
  const res = await fetch(`${BASE}/v1/dependencies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handleRes<ServiceDependency>(res);
}

export async function deleteDependency(id: string): Promise<void> {
  await fetch(`${BASE}/v1/dependencies/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// ─── Services ──────────────────────────────────────────────────────

export async function listServices(): Promise<ServiceInfo[]> {
  const res = await fetch(`${BASE}/v1/services`);
  return handleRes<ServiceInfo[]>(res);
}
