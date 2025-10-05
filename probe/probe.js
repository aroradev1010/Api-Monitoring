require("dotenv").config();
const axios = require("axios");

const INGEST_URL = process.env.INGEST_URL || "http://localhost:3000/v1/metrics";
const TARGET = process.env.TARGET || "https://httpbin.org/delay/5"; // simple endpoint
const API_ID = process.env.API_ID || "demo-api2";

async function probeOnce() {
  const start = Date.now();
  try {
    const res = await axios.get(TARGET, { timeout: 10000 });
    const latency = Date.now() - start;
    const payload = {
      api_id: API_ID,
      timestamp: new Date(),
      latency_ms: latency,
      status_code: res.status,
      error: null,
      tags: { target: TARGET },
    };
    await axios.post(INGEST_URL, payload);
    console.log("Sent metric", payload);
  } catch (err) {
    const latency = Date.now() - start;
    const payload = {
      api_id: API_ID,
      timestamp: new Date(),
      latency_ms: latency,
      status_code: err.response ? err.response.status : 0,
      error: err.message,
      tags: { target: TARGET },
    };
    try {
      await axios.post(INGEST_URL, payload);
    } catch (e) {
      console.error("Failed to send metric", e.message);
    }
    console.log("Sent failure metric", payload);
  }
}

probeOnce();
