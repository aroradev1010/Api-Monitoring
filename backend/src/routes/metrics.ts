// src/routes/metrics.ts
import express from "express";
import { ingestMetric, getMetrics } from "../controllers/metric.controller";

const router = express.Router();

router.post("/", ingestMetric);
router.get("/", getMetrics);

export default router;
