// frontend/src/services/api.js
const BACKEND = process.env.REACT_APP_BACKEND_URL || "http://localhost:3000";

async function call(path, opts = {}) {
  const url = `${BACKEND}${path}`;
  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText} - ${text}`);
  }
  // Empty body -> return {}
  const txt = await res.text();
  try {
    return txt ? JSON.parse(txt) : {};
  } catch {
    return txt;
  }
}

/* APIs */
export async function listApis() {
  return call("/v1/apis");
}

export async function createApi(payload) {
  return call("/v1/apis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteApi(api_id) {
  // Assuming backend route is DELETE /v1/apis/:api_id
  return call(`/v1/apis/${encodeURIComponent(api_id)}`, {
    method: "DELETE",
  });
}

/* Metrics */
export async function getMetrics(api_id, limit = 20) {
  return call(
    `/v1/metrics?api_id=${encodeURIComponent(api_id)}&limit=${limit}`
  );
}

/* Alerts */
export async function listAlerts({ api_id, state, limit = 50 } = {}) {
  const qs = new URLSearchParams();
  if (api_id) qs.set("api_id", api_id);
  if (state) qs.set("state", state);
  qs.set("limit", limit);
  return call(`/v1/alerts?${qs.toString()}`);
}

/* Rules */
export async function listRules(api_id) {
  const qs = api_id ? `?api_id=${encodeURIComponent(api_id)}` : "";
  return call(`/v1/rules${qs}`);
}

export async function createRule(payload) {
  return call("/v1/rules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteRule(rule_id) {
  // Assuming DELETE /v1/rules/:rule_id
  return call(`/v1/rules/${encodeURIComponent(rule_id)}`, {
    method: "DELETE",
  });
}
