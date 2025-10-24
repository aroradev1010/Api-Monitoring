// src/controllers/metric.controller.ts
import { Request, Response } from "express";
import Metric from "../models/metric.model";
import Api from "../models/api.model";
import logger from "../logger";
import { evaluateRulesForMetric } from "../services/ruleEngine";

/**
 * ingestMetric: assumes request body was validated by route-level middleware
 * (but we still defensively coerce/validate here).
 */
export async function ingestMetric(req: Request, res: Response) {
  try {
    const payload = req.body as {
      api_id: string;
      timestamp?: string | Date;
      latency_ms: number;
      status_code: number;
      error?: string | null;
      error_type?:
        | "none"
        | "timeout"
        | "network"
        | "http_error"
        | string
        | null;
      tags?: Record<string, any>;
    };

    // semantic check: ensure API exists
    const api = await Api.findOne({ api_id: payload.api_id }).lean().exec();
    if (!api) {
      return res.status(404).json({ error: "API not registered" });
    }

    // Defensive / sanitise error_type: only accept known values or fallback to "none"
    const allowedErrorTypes = ["none", "timeout", "network", "http_error"];
    const errorType =
      payload.error_type &&
      allowedErrorTypes.includes(String(payload.error_type))
        ? String(payload.error_type)
        : "none";

    // create metric document
    const metric = new Metric({
      api_id: payload.api_id,
      timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
      latency_ms: payload.latency_ms,
      status_code: payload.status_code,
      error: payload.error ?? null,
      error_type: errorType,
      tags: payload.tags ?? {},
    });

    await metric.save();

    // Fire-and-forget rule evaluation
    evaluateRulesForMetric(metric).catch((e) =>
      logger.error({ err: e, metricId: metric._id }, "Rule evaluation failed")
    );

    logger.debug(
      { api_id: metric.api_id, latency: metric.latency_ms },
      "metric ingested"
    );
    // 202 accepted — ingestion is async with rules executed in background
    return res.status(202).json({ status: "accepted" });
  } catch (err: any) {
    logger.error({ err }, "ingestMetric failed");
    return res.status(500).json({ error: "Failed to ingest metric" });
  }
}

/**
 * getMetrics: query ?api_id=&limit=
 */
export async function getMetrics(req: Request, res: Response) {
  try {
    const api_id = String(req.query.api_id || "");
    const limit = Math.min(Number(req.query.limit || 20), 100);

    if (!api_id) return res.status(400).json({ error: "api_id required" });

    const metrics = await Metric.find({ api_id })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean()
      .exec();
    return res.json(metrics);
  } catch (err: any) {
    logger.error({ err }, "getMetrics failed");
    return res.status(500).json({ error: "Failed to fetch metrics" });
  }
}

export default { ingestMetric, getMetrics };
