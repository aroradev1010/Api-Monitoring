// src/routes/stream.ts
import express from "express";
import { pubsub } from "../services/pubsub";

const router = express.Router();

// GET /v1/stream
router.get("/", (req, res) => {
  // Required headers for SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  // Allow CORS if needed (adjust as your app uses)
  res.setHeader("Access-Control-Allow-Origin", "*");

  // ensure headers sent immediately
  res.flushHeaders?.();

  // helper to write an SSE event (type + JSON data)
  const sendEvent = (eventName: string, data: any) => {
    try {
      res.write(`event: ${eventName}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      // ignore writes to closed streams
    }
  };

  // listeners
  const onMetric = (m: any) => sendEvent("metric", m);
  const onAlert = (a: any) => sendEvent("alert", a);

  pubsub.on("metric", onMetric);
  pubsub.on("alert", onAlert);

  // heartbeat to keep connection alive / detect broken clients
  const hb = setInterval(() => {
    try {
      res.write(`event: ping\ndata: ${JSON.stringify({ t: Date.now() })}\n\n`);
    } catch (err) {
      // ignore
    }
  }, 25000);

  // cleanup on client disconnect
  req.on("close", () => {
    clearInterval(hb);
    pubsub.off("metric", onMetric);
    pubsub.off("alert", onAlert);
    res.end();
  });
});

export default router;
