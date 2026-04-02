// probe/continuous-probe.js
require("dotenv").config();
const axios = require("axios");

const INGEST_URL = process.env.INGEST_URL || "http://localhost:3000/v1/events";
const API_ID = process.env.API_ID || "demo-api";
const TARGET = process.env.TARGET || "https://httpbin.org/delay/0";
const INTERVAL_MS = parseInt(process.env.PROBE_INTERVAL_MS || "3000", 10);
const POST_RETRIES = parseInt(process.env.POST_RETRIES || "3", 10);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function deriveStatus(statusCode, errorType) {
  if (errorType === "timeout") return "timeout";
  if (statusCode >= 500) return "error";
  return "ok";
}

async function postEvent(payload) {
  let attempt = 0;
  let backoff = 500; // ms
  while (attempt <= POST_RETRIES) {
    try {
      await axios.post(INGEST_URL, payload, { timeout: 5000 });
      return true;
    } catch (err) {
      attempt++;
      const status = err.response ? err.response.status : null;
      console.error(
        `[probe] post attempt ${attempt} failed`,
        status || err.message
      );
      if (attempt > POST_RETRIES) return false;
      // exponential backoff with jitter
      const jitter = Math.floor(Math.random() * 300);
      await sleep(backoff + jitter);
      backoff *= 2;
    }
  }
  return false;
}

async function probeOnce() {
  const start = Date.now();
  let payload;

  let parsedPath = "/";
  try { parsedPath = new URL(TARGET).pathname; } catch {}

  try {
    const res = await axios.get(TARGET, { timeout: 15000 });
    const latency = Date.now() - start;
    payload = {
      service: API_ID,
      kind: "http_request",
      operation: TARGET,
      status: "ok",
      latency_ms: latency,
      error_code: null,
      error_message: null,
      started_at: new Date(start).toISOString(),
      ended_at: new Date(start + latency).toISOString(),
      http: {
        method: "GET",
        path: parsedPath,
        status_code: res.status,
        target_url: TARGET,
      },
      tags: { target: TARGET },
      api_key: "default",
    };
  } catch (err) {
    const latency = Date.now() - start;
    const statusCode = err.response ? err.response.status : 0;
    let errorType = "network";
    if (err.code === "ECONNABORTED") errorType = "timeout";
    else if (err.response) errorType = "http_error";

    payload = {
      service: API_ID,
      kind: "http_request",
      operation: TARGET,
      status: deriveStatus(statusCode, errorType),
      latency_ms: latency,
      error_code: errorType !== "none" ? errorType.toUpperCase() : null,
      error_message: err.message,
      started_at: new Date(start).toISOString(),
      ended_at: new Date(start + latency).toISOString(),
      http: {
        method: "GET",
        path: parsedPath,
        status_code: statusCode,
        target_url: TARGET,
      },
      tags: { target: TARGET },
      api_key: "default",
    };
  }

  const ok = await postEvent(payload);
  if (ok) {
    console.log("[probe] sent event", {
      service: payload.service,
      latency_ms: payload.latency_ms,
      status: payload.status,
    });
  } else {
    console.error("[probe] failed to send event after retries", payload);
  }
}

async function runLoop() {
  console.log(
    `[probe] starting continuous probe. target=${TARGET} ingest=${INGEST_URL} interval=${INTERVAL_MS}ms`
  );
  while (true) {
    try {
      await probeOnce();
    } catch (err) {
      console.error("[probe] unexpected error", err.message || err);
    }
    await sleep(INTERVAL_MS);
  }
}

if (require.main === module) {
  runLoop().catch((err) => {
    console.error("[probe] fatal error", err);
    process.exit(1);
  });
}

module.exports = { probeOnce, runLoop };
