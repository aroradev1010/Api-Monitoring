// src/controllers/api.controller.ts
import { Request, Response } from "express";
import Api from "../models/api.model";
import logger from "../logger";

export async function listApis(req: Request, res: Response) {
  try {
    const apis = await Api.find().sort({ created_at: -1 });
    return res.json(apis);
  } catch (err: any) {
    logger.error({ err }, "listApis error");
    return res.status(500).json({ error: err.message || "internal error" });
  }
}

export async function createApi(req: Request, res: Response) {
  try {
    const body = req.body;
    const api = new Api(body);
    await api.save();
    return res.status(201).json(api);
  } catch (err: any) {
    logger.error({ err }, "createApi error");
    // handle duplicate key
    if (err && err.code === 11000) {
      return res.status(409).json({ error: "api_id already exists" });
    }
    return res.status(500).json({ error: err.message || "internal error" });
  }
}
