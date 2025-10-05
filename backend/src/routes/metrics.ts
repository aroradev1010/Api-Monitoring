// src/routes/metrics.ts
import express from "express";
import Joi from "joi";
import { validate } from "../middlewares/validate";
import { ingestMetric, getMetrics } from "../controllers/metric.controller";

const router = express.Router();

const metricSchema = Joi.object({
  api_id: Joi.string().required(),
  timestamp: Joi.date().required(),
  latency_ms: Joi.number().required(),
  status_code: Joi.number().required(),
  error: Joi.string().allow(null, ""),
  tags: Joi.object().optional(),
});

router.post("/", validate(metricSchema), ingestMetric);
router.get("/", getMetrics);

export default router;
