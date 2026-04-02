// src/controllers/probe.controller.ts
import { Request, Response } from "express";
import axios from "axios";
import Api from "../models/api.model";
import config from "../config";
import logger from "../logger";

export async function runProbe(req: Request, res: Response) {
  try {
    const apiId = String(req.params.api_id || req.body.api_id || "");
    if (!apiId) {
      return res.status(400).json({ error: "api_id required" });
    }

    const api = await Api.findOne({ api_id: apiId }).lean().exec();
    if (!api) {
      return res.status(404).json({ error: "api not found" });
    }

    const target = api.base_url;
    const timeout = Number(req.body.timeout ?? 10000); // ms, can be overridden

    const start = Date.now();
    let httpStatusCode = 0;
    let error: string | null = null;
    let errorType: "none" | "timeout" | "network" | "http_error" = "none";

    try {
      const r = await axios.get(target, { timeout });
      httpStatusCode = r.status ?? 0;
      error = null;
      errorType = "none";
    } catch (e: unknown) {
      const err = e as any;

      if (err?.code === "ECONNABORTED") {
        errorType = "timeout";
      } else if (err?.response && typeof err.response.status === "number") {
        errorType = "http_error";
        httpStatusCode = err.response.status ?? 0;
      } else {
        errorType = "network";
      }

      error = err?.message ? String(err.message) : String(err);
    }

    const latency = Date.now() - start;
    const startedAt = new Date(start);
    const endedAt = new Date(start + latency);

    // Derive event status per decision doc mapping
    let status: "ok" | "error" | "timeout";
    if (errorType === "timeout") {
      status = "timeout";
    } else if (httpStatusCode >= 500) {
      status = "error";
    } else {
      status = "ok";
    }

    const errorCode = errorType !== "none" ? errorType.toUpperCase() : null;

    let parsedPath = "/";
    try {
      parsedPath = new URL(target).pathname;
    } catch {
      // keep default
    }

    const eventPayload = {
      service: api.api_id,
      kind: "http_request",
      operation: target,
      correlation_id: null,
      parent_event_id: null,
      status,
      latency_ms: latency,
      error_code: errorCode,
      error_message: error,
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      http: {
        method: "GET",
        path: parsedPath,
        status_code: httpStatusCode,
        target_url: target,
      },
      tags: { probe: "manual", target },
      api_key: "default",
    };

    // Forward to local ingest endpoint so the normal pipeline + rule engine runs
    const ingestUrl = `http://127.0.0.1:${config.PORT}/v1/events`;
    try {
      await axios.post(ingestUrl, eventPayload, { timeout: 5000 });
      logger.info(
        { service: api.api_id, latency, status_code: httpStatusCode, status },
        "Probe completed & event forwarded"
      );
    } catch (postErr: any) {
      logger.error(
        { err: postErr },
        "Failed to forward event to ingest endpoint"
      );
      return res.status(502).json({
        event: eventPayload,
        warn: "failed to forward to ingest endpoint",
        forwardError: String(postErr?.data ?? postErr),
      });
    }

    return res.status(200).json({ event: eventPayload });
  } catch (err: any) {
    logger.error({ err }, "Probe failed unexpectedly");
    return res.status(500).json({ error: err?.message ?? "probe failed" });
  }
}

export default { runProbe };
