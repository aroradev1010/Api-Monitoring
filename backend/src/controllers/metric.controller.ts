// src/controllers/metric.controller.ts
//
// BACKWARD-COMPATIBILITY ADAPTER
// These functions accept the old metric-shaped payloads, convert them
// to Event documents, and delegate all persistence to the Event model.
// This keeps /v1/metrics working while Event is the canonical model.
//
import { Request, Response } from "express";
import Event from "../models/event.model";
import Api from "../models/api.model";
import logger from "../logger";
import { evaluateRulesForEvent } from "../services/ruleEngine";
import pubsub from "../services/pubsub";

/**
 * Convert a legacy metric payload to an Event and persist it.
 */
export async function ingestMetric(req: Request, res: Response) {
  try {
    const payload = req.body as {
      api_id: string;
      timestamp?: string | Date;
      latency_ms: number;
      status_code: number;
      error?: string | null;
      error_type?:
        | "none"
        | "timeout"
        | "network"
        | "http_error"
        | string
        | null;
      tags?: Record<string, any>;
    };

    // semantic check: ensure API exists
    const api = await Api.findOne({ api_id: payload.api_id }).lean().exec();
    if (!api) {
      return res.status(404).json({ error: "API not registered" });
    }

    // Map metric fields → Event fields
    const startedAt = payload.timestamp
      ? new Date(payload.timestamp)
      : new Date();
    const latencyMs = payload.latency_ms;
    const endedAt = new Date(startedAt.getTime() + latencyMs);

    const allowedErrorTypes = ["none", "timeout", "network", "http_error"];
    const errorType =
      payload.error_type &&
      allowedErrorTypes.includes(String(payload.error_type))
        ? String(payload.error_type)
        : "none";

    // Status mapping per decision doc
    let status: "ok" | "error" | "timeout";
    if (errorType === "timeout") {
      status = "timeout";
    } else if (payload.status_code >= 500) {
      status = "error";
    } else {
      status = "ok";
    }

    const errorCode =
      errorType !== "none" ? errorType.toUpperCase() : null;
    const errorMessage = payload.error ?? null;

    const targetUrl =
      (payload.tags as any)?.target ?? api.base_url ?? "";
    let parsedPath = "/";
    try {
      parsedPath = new URL(targetUrl).pathname;
    } catch {
      // keep default "/"
    }

    const event = new Event({
      service: payload.api_id,
      kind: "http_request" as const,
      operation: targetUrl || `probe:${payload.api_id}`,
      correlation_id: null,
      parent_event_id: null,
      status,
      latency_ms: latencyMs,
      error_code: errorCode,
      error_message: errorMessage,
      started_at: startedAt,
      ended_at: endedAt,
      http: {
        method: "GET",
        path: parsedPath,
        status_code: payload.status_code,
        target_url: targetUrl,
      },
      tags: payload.tags ?? {},
      received_at: new Date(),
      sdk_version: null,
      api_key: "default",
    });

    const saved = await event.save();

    // Publish to pubsub for real-time streaming
    try {
      pubsub.emit("event", saved.toObject());
    } catch (e) {
      logger.warn({ err: e }, "pubsub emit event failed");
    }

    // Fire-and-forget rule evaluation
    evaluateRulesForEvent(saved).catch((e) =>
      logger.error({ err: e, eventId: saved._id }, "Rule evaluation failed")
    );

    logger.debug(
      { service: event.service, latency: event.latency_ms },
      "metric ingested (compat → event)"
    );
    return res.status(202).json({ status: "accepted" });
  } catch (err: any) {
    logger.error({ err }, "ingestMetric failed");
    return res.status(500).json({ error: "Failed to ingest metric" });
  }
}

/**
 * getMetrics: backward-compat wrapper that reads from Event collection
 * and maps back to the old metric shape.
 */
export async function getMetrics(req: Request, res: Response) {
  try {
    const api_id = String(req.query.api_id || "");
    const limit = Math.min(Number(req.query.limit || 20), 100);

    if (!api_id) return res.status(400).json({ error: "api_id required" });

    const events = await Event.find({ service: api_id })
      .sort({ started_at: -1 })
      .limit(limit)
      .lean()
      .exec();

    // Map events back to legacy metric shape for backward compatibility
    const metrics = events.map((e) => ({
      _id: e._id,
      api_id: e.service,
      timestamp: e.started_at,
      latency_ms: e.latency_ms,
      status_code: e.http?.status_code ?? 0,
      error: e.error_message ?? null,
      error_type:
        e.status === "timeout"
          ? "timeout"
          : e.error_code
          ? e.error_code.toLowerCase()
          : "none",
      tags: e.tags ?? {},
    }));

    return res.json(metrics);
  } catch (err: any) {
    logger.error({ err }, "getMetrics failed");
    return res.status(500).json({ error: "Failed to fetch metrics" });
  }
}

export default { ingestMetric, getMetrics };
