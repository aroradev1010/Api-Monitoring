// backend/src/controllers/api.controller.ts
import { Request, Response } from "express";
import Joi from "joi";
import Api from "../models/api.model";
import logger from "../logger";

const apiSchema = Joi.object({
  api_id: Joi.string().alphanum().required(),
  name: Joi.string().required(),
  base_url: Joi.string().uri().required(),
  probe_interval: Joi.number().integer().min(1).default(30),
  expected_status: Joi.array().items(Joi.number().integer()).default([200]),
});

export async function createApi(req: Request, res: Response) {
  const { error, value } = apiSchema.validate(req.body);
  if (error) return res.status(400).json({ error: error.message });

  try {
    const existing = await Api.findOne({ api_id: value.api_id }).exec();
    if (existing)
      return res.status(409).json({ error: "api_id already exists" });

    const api = new Api(value);
    await api.save();
    logger.info({ api_id: api.api_id }, "API registered");
    return res.status(201).json(api);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function listApis(req: Request, res: Response) {
  try {
    const apis = await Api.find().sort({ created_at: -1 }).lean().exec();
    return res.json(apis);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getApi(req: Request, res: Response) {
  const { api_id } = req.params;
  try {
    const api = await Api.findOne({ api_id }).lean().exec();
    if (!api) return res.status(404).json({ error: "API not found" });
    return res.json(api);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function deleteApi(req: Request, res: Response) {
  const { api_id } = req.params;
  try {
    const r = await Api.deleteOne({ api_id }).exec();
    if (r.deletedCount === 0)
      return res.status(404).json({ error: "Not found" });
    return res.status(204).send();
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function updateApi(req: Request, res: Response) {
  const { api_id } = req.params;
  const { error, value } = apiSchema.validate(req.body, {
    presence: "optional",
  });
  if (error) return res.status(400).json({ error: error.message });
  try {
    const api = await Api.findOneAndUpdate({ api_id }, value, {
      new: true,
    }).exec();
    if (!api) return res.status(404).json({ error: "Not found" });
    return res.json(api);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
