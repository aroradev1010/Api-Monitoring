require("dotenv").config();
const axios = require("axios");

const INGEST_URL = process.env.INGEST_URL || "http://localhost:3000/v1/events";
const TARGET = process.env.TARGET || "https://youtube.com";
const API_ID = process.env.API_ID || "demo-api";

function deriveStatus(statusCode, errorType) {
  if (errorType === "timeout") return "timeout";
  if (statusCode >= 500) return "error";
  return "ok";
}

async function probeOnce() {
  const start = Date.now();
  let getResponse;
  try {
    getResponse = await axios.get(TARGET, { timeout: 15000 });
    const latency = Date.now() - start;
    const startedAt = new Date(start).toISOString();
    const endedAt = new Date(start + latency).toISOString();

    let parsedPath = "/";
    try { parsedPath = new URL(TARGET).pathname; } catch {}

    const payload = {
      service: API_ID,
      kind: "http_request",
      operation: TARGET,
      status: "ok",
      latency_ms: latency,
      error_code: null,
      error_message: null,
      started_at: startedAt,
      ended_at: endedAt,
      http: {
        method: "GET",
        path: parsedPath,
        status_code: getResponse.status,
        target_url: TARGET,
      },
      tags: { target: TARGET },
      api_key: "default",
    };
    console.log("[probe] GET success", {
      url: TARGET,
      status: getResponse.status,
      latency,
    });
    try {
      const postRes = await axios.post(INGEST_URL, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 5000,
      });
      console.log("[probe] POST success", {
        ingest: INGEST_URL,
        status: postRes.status,
      });
    } catch (postErr) {
      console.error("[probe] POST to ingest failed", {
        url: postErr.config?.url,
        method: postErr.config?.method,
        status: postErr.response?.status,
        message: postErr.message,
        data: postErr.response?.data,
      });
    }
  } catch (err) {
    const latency = Date.now() - start;
    const startedAt = new Date(start).toISOString();
    const endedAt = new Date(start + latency).toISOString();
    const failedUrl = err.config?.url || "unknown";
    const failedMethod = err.config?.method || "unknown";
    console.error("[probe] Operation failed", {
      failedUrl,
      failedMethod,
      status: err.response?.status,
      message: err.message,
      data: err.response?.data,
    });

    const statusCode = err.response ? err.response.status : 0;
    let errorType = "network";
    if (err.code === "ECONNABORTED") errorType = "timeout";
    else if (err.response) errorType = "http_error";

    let parsedPath = "/";
    try { parsedPath = new URL(TARGET).pathname; } catch {}

    const payload = {
      service: API_ID,
      kind: "http_request",
      operation: TARGET,
      status: deriveStatus(statusCode, errorType),
      latency_ms: latency,
      error_code: errorType !== "none" ? errorType.toUpperCase() : null,
      error_message: err.message,
      started_at: startedAt,
      ended_at: endedAt,
      http: {
        method: "GET",
        path: parsedPath,
        status_code: statusCode,
        target_url: TARGET,
      },
      tags: { target: TARGET, failedUrl, failedMethod },
      api_key: "default",
    };

    try {
      const postRes2 = await axios.post(INGEST_URL, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 5000,
      });
      console.log("[probe] Sent failure event", postRes2.status);
    } catch (e) {
      console.error("[probe] Failed to send failure event", {
        message: e.message,
        url: e.config?.url,
        status: e.response?.status,
      });
    }
  }
}

probeOnce();
