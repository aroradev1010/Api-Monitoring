require("dotenv").config();
const axios = require("axios");

const INGEST_URL = process.env.INGEST_URL || "http://localhost:3000/v1/metrics";
const TARGET = process.env.TARGET || "https://youtube.com";
const API_ID = process.env.API_ID || "demo-api";

async function probeOnce() {
  const start = Date.now();
  let getResponse;
  try {
    getResponse = await axios.get(TARGET, { timeout: 15000 });
    const latency = Date.now() - start;
    const payload = {
      api_id: API_ID,
      timestamp: new Date(),
      latency_ms: latency,
      status_code: getResponse.status,
      error: null,
      tags: { target: TARGET },
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
    // Determine which request failed: err.config.url shows origin
    const latency = Date.now() - start;
    const failedUrl = err.config?.url || "unknown";
    const failedMethod = err.config?.method || "unknown";
    console.error("[probe] Operation failed", {
      failedUrl,
      failedMethod,
      status: err.response?.status,
      message: err.message,
      data: err.response?.data,
    });

    const payload = {
      api_id: API_ID,
      timestamp: new Date(),
      latency_ms: latency,
      status_code: err.response ? err.response.status : 0,
      error: err.message,
      tags: { target: TARGET, failedUrl, failedMethod },
    };

    try {
      const postRes2 = await axios.post(INGEST_URL, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 5000,
      });
      console.log("[probe] Sent failure metric", postRes2.status);
    } catch (e) {
      console.error("[probe] Failed to send failure metric", {
        message: e.message,
        url: e.config?.url,
        status: e.response?.status,
      });
    }
  }
}

probeOnce();
