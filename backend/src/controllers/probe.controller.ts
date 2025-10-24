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
    let status_code = 0;
    let error: string | null = null;
    let error_type: "none" | "timeout" | "network" | "http_error" = "none";

    try {
      const r = await axios.get(target, { timeout });
      status_code = r.status ?? 0;
      error = null;
      error_type = "none";
    } catch (e: unknown) {
      // Use runtime checks instead of depending on named types that might not exist
      const err = e as any;

      // Axios uses code === 'ECONNABORTED' for timeouts
      if (err?.code === "ECONNABORTED") {
        error_type = "timeout";
      } else if (err?.response && typeof err.response.status === "number") {
        // HTTP error (server responded with non-2xx)
        error_type = "http_error";
        status_code = err.response.status ?? 0;
      } else {
        // Network/DNS/refused etc.
        error_type = "network";
      }

      // Friendly error message
      error = err?.message ? String(err.message) : String(err);
    }

    const latency = Date.now() - start;

    const metricPayload = {
      api_id: api.api_id,
      timestamp: new Date().toISOString(),
      latency_ms: latency,
      status_code,
      error,
      error_type,
      tags: { probe: "manual", target },
    };

    // Forward to local ingest endpoint so the normal pipeline + rule engine runs
    const ingestUrl = `http://127.0.0.1:${config.PORT}/v1/metrics`;
    try {
      await axios.post(ingestUrl, metricPayload, { timeout: 5000 });
      logger.info(
        { api_id: api.api_id, latency, status_code, error_type },
        "Probe completed & metric forwarded"
      );
    } catch (postErr: any) {
      // forward failure: still return metric info but log the error
      logger.error(
        { err: postErr },
        "Failed to forward metric to ingest endpoint"
      );
      // Return metric payload but mention forward problem
      return res.status(502).json({
        metric: metricPayload,
        warn: "failed to forward to ingest endpoint",
        forwardError: String(postErr?.data ?? postErr),
      });
    }

    return res.status(200).json({ metric: metricPayload });
  } catch (err: any) {
    logger.error({ err }, "Probe failed unexpectedly");
    return res.status(500).json({ error: err?.message ?? "probe failed" });
  }
}

export default { runProbe };
