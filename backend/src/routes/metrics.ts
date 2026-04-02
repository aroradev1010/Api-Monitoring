// backend/src/routes/metrics.ts
//
// DEPRECATED: This route is kept for backward compatibility only.
// All new consumers should use /v1/events instead.
// Internally, these handlers write/read Event documents.
//
import express from "express";
import { validate } from "../middlewares/validate";
import { ingestMetric, getMetrics } from "../controllers/metric.controller";
import { ingestMetricSchema } from "../validation/metric";

const router = express.Router();

// POST /v1/metrics - ingest a metric (DEPRECATED — use POST /v1/events)
router.post("/", validate(ingestMetricSchema), ingestMetric);

// GET /v1/metrics?api_id=...&limit=... (DEPRECATED — use GET /v1/events)
router.get("/", getMetrics);

export default router;
