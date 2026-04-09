// src/controllers/event.controller.ts
import { Request, Response } from "express";
import Event from "../models/event.model";
import Api from "../models/api.model";
import Service from "../models/service.model";
import logger from "../logger";
import { evaluateRulesForEvent } from "../services/ruleEngine";
import { attachEvent } from "../services/correlationEngine";
import pubsub from "../services/pubsub";

/**
 * ingestEvent: accepts a validated event payload and persists it.
 */
export async function ingestEvent(req: Request, res: Response) {
  try {
    const payload = req.body;

    // semantic check: ensure the service (API) is registered
    const api = await Api.findOne({ api_id: payload.service }).lean().exec();
    if (!api) {
      return res.status(404).json({ error: "API not registered" });
    }

    const event = new Event({
      service: payload.service,
      kind: payload.kind,
      operation: payload.operation,
      correlation_id: payload.correlation_id ?? null,
      parent_event_id: payload.parent_event_id ?? null,
      status: payload.status,
      latency_ms: payload.latency_ms,
      error_code: payload.error_code ?? null,
      error_message: payload.error_message ?? null,
      started_at: new Date(payload.started_at),
      ended_at: new Date(payload.ended_at),
      http: payload.http ?? undefined,
      job: payload.job ?? undefined,
      tags: payload.tags ?? {},
      received_at: new Date(),
      sdk_version: payload.sdk_version ?? null,
      api_key: payload.api_key ?? "default",
    });

    const saved = await event.save();

    // Upsert Service record (auto-create on first event)
    Service.updateOne(
      { name: saved.service },
      {
        $setOnInsert: { first_seen_at: new Date() },
        $set: { last_seen_at: new Date() },
        $inc: { event_count: 1 },
      },
      { upsert: true }
    )
      .exec()
      .catch((e) => logger.warn({ err: e }, "Service upsert failed"));

    // Publish to pubsub for real-time streaming
    try {
      pubsub.emit("event", saved.toObject());
    } catch (e) {
      logger.warn({ err: e }, "pubsub emit event failed");
    }

    // Attach to correlation engine (fire-and-forget)
    try {
      attachEvent(saved);
    } catch (e) {
      logger.warn({ err: e }, "correlationEngine.attachEvent failed");
    }

    // Fire-and-forget rule evaluation
    evaluateRulesForEvent(saved).catch((e) =>
      logger.error({ err: e, eventId: saved._id }, "Rule evaluation failed")
    );

    logger.debug(
      { service: event.service, latency: event.latency_ms },
      "event ingested"
    );
    return res.status(202).json({ status: "accepted" });
  } catch (err: any) {
    logger.error({ err }, "ingestEvent failed");
    return res.status(500).json({ error: "Failed to ingest event" });
  }
}

/**
 * getEvents: query ?service=&limit=
 */
export async function getEvents(req: Request, res: Response) {
  try {
    const service = String(req.query.service || "");
    const limit = Math.min(Number(req.query.limit || 20), 100);

    if (!service) return res.status(400).json({ error: "service required" });

    const events = await Event.find({ service })
      .sort({ started_at: -1 })
      .limit(limit)
      .lean()
      .exec();
    return res.json(events);
  } catch (err: any) {
    logger.error({ err }, "getEvents failed");
    return res.status(500).json({ error: "Failed to fetch events" });
  }
}

/**
 * ingestBatch: accepts { events: Event[] } and processes each independently.
 * Reuses the same ingest logic as ingestEvent.
 */
export async function ingestBatch(req: Request, res: Response) {
  try {
    const { events: payloads } = req.body;

    if (!Array.isArray(payloads) || payloads.length === 0) {
      return res.status(400).json({ error: "events array is required" });
    }

    let accepted = 0;

    for (const payload of payloads) {
      try {
        // Semantic check: ensure the service (API) is registered
        const api = await Api.findOne({ api_id: payload.service }).lean().exec();
        if (!api) {
          logger.warn({ service: payload.service }, "batch: API not registered, skipping event");
          continue;
        }

        const event = new Event({
          event_id: payload.event_id ?? undefined,
          service: payload.service,
          kind: payload.kind,
          operation: payload.operation,
          correlation_id: payload.correlation_id ?? null,
          parent_event_id: payload.parent_event_id ?? null,
          status: payload.status,
          latency_ms: payload.latency_ms,
          error_code: payload.error_code ?? null,
          error_message: payload.error_message ?? null,
          started_at: new Date(payload.started_at),
          ended_at: new Date(payload.ended_at),
          http: payload.http ?? undefined,
          job: payload.job ?? undefined,
          tags: payload.tags ?? {},
          received_at: new Date(),
          sdk_version: payload.sdk_version ?? null,
          api_key: payload.api_key ?? "default",
        });

        const saved = await event.save();

        // Upsert Service record
        Service.updateOne(
          { name: saved.service },
          {
            $setOnInsert: { first_seen_at: new Date() },
            $set: { last_seen_at: new Date() },
            $inc: { event_count: 1 },
          },
          { upsert: true }
        )
          .exec()
          .catch((e) => logger.warn({ err: e }, "Service upsert failed"));

        // Publish to pubsub
        try {
          pubsub.emit("event", saved.toObject());
        } catch (e) {
          logger.warn({ err: e }, "pubsub emit event failed");
        }

        // Attach to correlation engine
        try {
          attachEvent(saved);
        } catch (e) {
          logger.warn({ err: e }, "correlationEngine.attachEvent failed");
        }

        // Fire-and-forget rule evaluation
        evaluateRulesForEvent(saved).catch((e) =>
          logger.error({ err: e, eventId: saved._id }, "Rule evaluation failed")
        );

        accepted++;
      } catch (innerErr) {
        logger.warn({ err: innerErr }, "batch: failed to process one event, continuing");
      }
    }

    logger.debug({ accepted, total: payloads.length }, "batch ingested");
    return res.status(202).json({ status: "accepted", count: accepted });
  } catch (err: any) {
    logger.error({ err }, "ingestBatch failed");
    return res.status(500).json({ error: "Failed to ingest batch" });
  }
}

export default { ingestEvent, getEvents, ingestBatch };
