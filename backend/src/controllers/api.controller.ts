// src/controllers/api.controller.ts
import { Request, Response } from "express";
import Api from "../models/api.model";
import logger from "../logger";

export async function listApis(_req: Request, res: Response) {
  try {
    const apis = await Api.find().sort({ created_at: -1 });
    return res.json(apis);
  } catch (err: any) {
    logger.error({ err }, "listApis failed");
    return res.status(500).json({ error: "Failed to list APIs" });
  }
}

export async function createApi(req: Request, res: Response) {
  try {
    const body = req.body as {
      api_id: string;
      name: string;
      base_url: string;
      probe_interval?: number;
      expected_status?: number[];
    };

    // Business validation: uniqueness check
    const existing = await Api.findOne({ api_id: body.api_id });
    if (existing) {
      return res.status(409).json({ error: "api_id already exists" });
    }

    const api = new Api({
      api_id: body.api_id,
      name: body.name,
      base_url: body.base_url,
      probe_interval: body.probe_interval,
      expected_status: body.expected_status,
    });

    await api.save();
    logger.info({ api_id: api.api_id }, "API registered");
    return res.status(201).json(api);
  } catch (err: any) {
    logger.error({ err }, "createApi failed");
    return res.status(500).json({ error: "Failed to create API" });
  }
}
