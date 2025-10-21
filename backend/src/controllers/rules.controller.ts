import { Request, Response } from "express";
import Rule from "../models/rule.model";

export async function createRule(req: Request, res: Response) {
  try {
    const body = req.body;
    // minimal validation here; in future use Joi
    const r = await Rule.create(body);
    res.status(201).json(r);
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "rule_id already exists" });
    }
    res.status(500).json({ error: err.message });
  }
}

export async function listRules(_req: Request, res: Response) {
  const rules = await Rule.find().sort({ created_at: -1 });
  res.json(rules);
}

export async function deleteRule(req: Request, res: Response) {
  const { id } = req.params;
  await Rule.deleteOne({ rule_id: id });
  res.status(204).send();
}
