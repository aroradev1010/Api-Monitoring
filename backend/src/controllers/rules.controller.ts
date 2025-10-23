// backend/src/controllers/rule.controller.ts
import { Request, Response } from "express";
import Joi from "joi";
import Rule from "../models/rule.model";
import logger from "../logger";

const ruleSchema = Joi.object({
  rule_id: Joi.string().required(),
  name: Joi.string().required(),
  api_id: Joi.string().required(),
  type: Joi.string().valid("latency_gt", "status_not").required(),
  threshold: Joi.alternatives()
    .try(Joi.number().integer(), Joi.array())
    .required(),
});

export async function createRule(req: Request, res: Response) {
  const { error, value } = ruleSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  try {
    const existing = await Rule.findOne({ rule_id: value.rule_id }).exec();
    if (existing)
      return res.status(409).json({ error: "rule_id already exists" });

    const r = new Rule(value);
    await r.save();
    logger.info({ rule_id: r.rule_id, api_id: r.api_id }, "Rule created");
    return res.status(201).json(r);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function listRules(req: Request, res: Response) {
  const { api_id } = req.query;
  try {
    const q = api_id ? { api_id: String(api_id) } : {};
    const rules = await Rule.find(q).sort({ _id: -1 }).lean().exec();
    return res.json(rules);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function deleteRule(req: Request, res: Response) {
  const { rule_id } = req.params;
  try {
    const r = await Rule.deleteOne({ rule_id }).exec();
    if (r.deletedCount === 0)
      return res.status(404).json({ error: "Not found" });
    return res.status(204).send();
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
