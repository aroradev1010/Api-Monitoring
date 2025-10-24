// backend/src/controllers/rule.controller.ts
import { Request, Response } from "express";
import Rule from "../models/rule.model";
import logger from "../logger";

export async function createRule(req: Request, res: Response) {
  try {
    // Defensive: ensure body exists and has required field (in case middleware was not applied)
    if (!req.body || typeof req.body.rule_id !== "string") {
      return res
        .status(400)
        .json({ error: "Invalid payload: rule_id required" });
    }

    const value = req.body as {
      rule_id: string;
      name: string;
      api_id?: string | null;
      type: string;
      threshold: number | number[];
    };

    const existing = await Rule.findOne({ rule_id: value.rule_id }).exec();
    if (existing) {
      return res.status(409).json({ error: "rule_id already exists" });
    }

    const r = new Rule(value);
    await r.save();
    logger.info({ rule_id: r.rule_id, api_id: r.api_id }, "Rule created");
    return res.status(201).json(r);
  } catch (err: any) {
    logger.error({ err }, "createRule failed");
    return res.status(500).json({ error: err?.message ?? "internal error" });
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
