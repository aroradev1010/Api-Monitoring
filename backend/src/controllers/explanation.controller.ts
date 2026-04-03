// src/controllers/explanation.controller.ts
import { Request, Response } from "express";
import Explanation from "../models/explanation.model";
import logger from "../logger";

/**
 * GET /v1/explanations?service=&limit=
 */
export async function getExplanations(req: Request, res: Response) {
  try {
    const service = req.query.service ? String(req.query.service) : null;
    const limit = Math.min(Number(req.query.limit || 20), 100);

    const filter: any = {};
    if (service) {
      filter.affected_services = service;
    }

    const explanations = await Explanation.find(filter)
      .sort({ created_at: -1 })
      .limit(limit)
      .lean()
      .exec();

    return res.json(explanations);
  } catch (err: any) {
    logger.error({ err }, "getExplanations failed");
    return res.status(500).json({ error: "Failed to fetch explanations" });
  }
}

/**
 * GET /v1/explanations/latest?service=
 */
export async function getLatestExplanation(req: Request, res: Response) {
  try {
    const service = req.query.service ? String(req.query.service) : null;
    if (!service) {
      return res.status(400).json({ error: "service query param required" });
    }

    const explanation = await Explanation.findOne({
      affected_services: service,
    })
      .sort({ created_at: -1 })
      .lean()
      .exec();

    if (!explanation) {
      return res.status(404).json({ error: "No explanation found" });
    }

    return res.json(explanation);
  } catch (err: any) {
    logger.error({ err }, "getLatestExplanation failed");
    return res.status(500).json({ error: "Failed to fetch explanation" });
  }
}

/**
 * GET /v1/explanations/:id
 */
export async function getExplanationById(req: Request, res: Response) {
  try {
    const id = req.params.id;
    const explanation = await Explanation.findOne({ explanation_id: id })
      .lean()
      .exec();

    if (!explanation) {
      return res.status(404).json({ error: "Explanation not found" });
    }

    return res.json(explanation);
  } catch (err: any) {
    logger.error({ err }, "getExplanationById failed");
    return res.status(500).json({ error: "Failed to fetch explanation" });
  }
}
