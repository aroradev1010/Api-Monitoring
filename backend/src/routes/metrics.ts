// backend/src/routes/metrics.ts
import express from "express";
import { validate } from "../middlewares/validate";
import { ingestMetric, getMetrics } from "../controllers/metric.controller";
import { ingestMetricSchema } from "../validation/metric";

const router = express.Router();

// POST /v1/metrics - ingest a metric
router.post("/", validate(ingestMetricSchema), ingestMetric);

// GET /v1/metrics?api_id=...&limit=...
router.get("/", getMetrics);

export default router;
