// probe/continuous-probe.js
require("dotenv").config();
const axios = require("axios");

const INGEST_URL = process.env.INGEST_URL || "http://localhost:3000/v1/metrics";
const API_ID = process.env.API_ID || "demo-api";
const TARGET = process.env.TARGET || "https://httpbin.org/delay/0";
const INTERVAL_MS = parseInt(process.env.PROBE_INTERVAL_MS || "3000", 10); // default 30s
const POST_RETRIES = parseInt(process.env.POST_RETRIES || "3", 10);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postMetric(payload) {
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
  try {
    const res = await axios.get(TARGET, { timeout: 15000 });
    const latency = Date.now() - start;
    payload = {
      api_id: API_ID,
      timestamp: new Date(),
      latency_ms: latency,
      status_code: res.status,
      error: null,
      tags: { target: TARGET },
    };
  } catch (err) {
    const latency = Date.now() - start;
    payload = {
      api_id: API_ID,
      timestamp: new Date(),
      latency_ms: latency,
      status_code: err.response ? err.response.status : 0,
      error: err.message,
      tags: { target: TARGET },
    };
  }

  const ok = await postMetric(payload);
  if (ok) {
    console.log("[probe] sent metric", {
      api_id: payload.api_id,
      latency_ms: payload.latency_ms,
      status_code: payload.status_code,
    });
  } else {
    console.error("[probe] failed to send metric after retries", payload);
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
