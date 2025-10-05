const express = require("express");
const Joi = require("joi");
const Metric = require("../models/metric.model");
const Api = require("../models/api.model");
const { evaluateRulesForMetric } = require("../services/ruleEngine");

const router = express.Router();

const metricSchema = Joi.object({
  api_id: Joi.string().required(),
  timestamp: Joi.date().required(),
  latency_ms: Joi.number().required(),
  status_code: Joi.number().required(),
  error: Joi.string().allow(null, ""),
  tags: Joi.object().optional(),
});

router.post("/", async (req, res) => {
  const { error, value } = metricSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  try {
    const api = await Api.findOne({ api_id: value.api_id });
    if (!api) return res.status(404).json({ error: "API not registered" });

    const metric = new Metric(value);
    await metric.save();

    // prototype: synchronous rule eval (ok for Sprint 1)
    evaluateRulesForMetric(metric).catch((e) =>
      console.error("Rule eval failed", e)
    );

    return res.status(202).json({ status: "accepted" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/", async (req, res) => {
  const { api_id, limit = 20 } = req.query;
  if (!api_id) return res.status(400).json({ error: "api_id required" });
  try {
    const metrics = await Metric.find({ api_id })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
