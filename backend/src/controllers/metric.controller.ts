// src/controllers/metric.controller.ts
import { Request, Response } from "express";
import Joi from "joi";
import Metric from "../models/metric.model";
import Api from "../models/api.model";
import { evaluateRulesForMetric } from "../services/ruleEngine";

const metricSchema = Joi.object({
  api_id: Joi.string().required(),
  timestamp: Joi.date().required(),
  latency_ms: Joi.number().required(),
  status_code: Joi.number().required(),
  error: Joi.string().allow(null, ""),
  tags: Joi.object().optional(),
});

export async function ingestMetric(req: Request, res: Response) {
  const { error, value } = metricSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  try {
    const api = await Api.findOne({ api_id: value.api_id });
    if (!api) return res.status(404).json({ error: "API not registered" });

    const metric = new Metric(value);
    await metric.save();

    // prototype: evaluate rules asynchronously
    evaluateRulesForMetric(metric).catch((e) =>
      console.error("Rule eval failed", e)
    );

    return res.status(202).json({ status: "accepted" });
  } catch (err: any) {
    console.error("ingestMetric error", err);
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
    console.error("getMetrics error", err);
    return res.status(500).json({ error: err.message || "internal error" });
  }
}
