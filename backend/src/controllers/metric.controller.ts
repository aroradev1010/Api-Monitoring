// src/controllers/metric.controller.ts
import { Request, Response } from "express";
import Metric from "../models/metric.model";
import Api from "../models/api.model";
import { evaluateRulesForMetric } from "../services/ruleEngine";
import logger from "../logger";
export async function ingestMetric(req: Request, res: Response) {
  try {
    const value = req.body;
    const api = await Api.findOne({ api_id: value.api_id });
    if (!api) return res.status(404).json({ error: "API not registered" });

    const metric = new Metric(value);
    await metric.save();

    // prototype: evaluate rules asynchronously
    evaluateRulesForMetric(metric).catch((e) =>
      logger.error({ e }, "Rule eval failed")
    );

    return res.status(202).json({ status: "accepted" });
  } catch (err: any) {
    logger.error({ err }, "ingestMetric error");
    return res.status(500).json({ error: err.message || "internal error" });
  }
}

export async function getMetrics(req: Request, res: Response) {
  const { api_id, limit = 20 } = req.query;
  if (!api_id) return res.status(400).json({ error: "api_id required" });
  try {
    const metrics = await Metric.find({ api_id: String(api_id) })
      .sort({ timestamp: -1 })
      .limit(parseInt(String(limit)));
    return res.json(metrics);
  } catch (err: any) {
    logger.error({ err }, "getMetrics error");
    return res.status(500).json({ error: err.message || "internal error" });
  }
}
