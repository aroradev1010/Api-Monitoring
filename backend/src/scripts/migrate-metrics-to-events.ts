// backend/src/scripts/migrate-metrics-to-events.ts
//
// One-time migration script: Metric → Event
// Usage: npx ts-node src/scripts/migrate-metrics-to-events.ts
//
import mongoose from "mongoose";
import dotenv from "dotenv";
import Metric, { IMetric } from "../models/metric.model";
import Event from "../models/event.model";
import { randomUUID } from "crypto";

dotenv.config();

const BATCH_SIZE = 500;

/**
 * Map a single Metric document to an Event-shaped plain object.
 */
export function mapMetricToEvent(m: IMetric) {
  const startedAt = m.timestamp ?? new Date();
  const latencyMs = m.latency_ms ?? 0;
  const endedAt = new Date(new Date(startedAt).getTime() + latencyMs);

  const errorType = m.error_type ?? "none";

  // Status mapping per decision doc
  let status: "ok" | "error" | "timeout";
  if (errorType === "timeout") {
    status = "timeout";
  } else if (m.status_code >= 500) {
    status = "error";
  } else {
    status = "ok";
  }

  // error_code: if error_type !== "none", store uppercase error type
  const errorCode = errorType !== "none" ? errorType.toUpperCase() : null;

  // error_message: use existing metric error string if present
  const errorMessage = m.error ?? null;

  // Extract target URL from tags or fall back
  const targetUrl = (m.tags as any)?.target ?? "";

  let parsedPath = "/";
  try {
    if (targetUrl) parsedPath = new URL(targetUrl).pathname;
  } catch {
    // keep default
  }

  return {
    event_id: randomUUID(),
    service: m.api_id,
    kind: "http_request" as const,
    operation: targetUrl || `probe:${m.api_id}`,
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
      status_code: m.status_code,
      target_url: targetUrl,
    },
    tags: m.tags ?? {},
    received_at: m.timestamp ?? new Date(),
    sdk_version: null,
    api_key: "default",
  };
}

async function migrate() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("MONGO_URI is required. Set it in .env or environment.");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log("[migration] Connected to MongoDB");

  const totalMetrics = await Metric.countDocuments();
  console.log(`[migration] Found ${totalMetrics} Metric documents to migrate`);

  if (totalMetrics === 0) {
    console.log("[migration] Nothing to migrate. Exiting.");
    await mongoose.disconnect();
    return;
  }

  let migrated = 0;
  let errors = 0;
  const cursor = Metric.find().cursor({ batchSize: BATCH_SIZE });

  let batch: any[] = [];

  for await (const doc of cursor) {
    try {
      const eventData = mapMetricToEvent(doc as IMetric);
      batch.push({ insertOne: { document: eventData } });
    } catch (err) {
      errors++;
      console.error(`[migration] Error mapping metric ${doc._id}:`, err);
    }

    if (batch.length >= BATCH_SIZE) {
      try {
        await Event.bulkWrite(batch, { ordered: false });
        migrated += batch.length;
        console.log(`[migration] Progress: ${migrated}/${totalMetrics}`);
      } catch (err: any) {
        // Some may have succeeded in unordered mode
        const insertedCount = err?.result?.nInserted ?? 0;
        migrated += insertedCount;
        errors += batch.length - insertedCount;
        console.error(`[migration] Bulk write error:`, err?.message);
      }
      batch = [];
    }
  }

  // Flush remaining batch
  if (batch.length > 0) {
    try {
      await Event.bulkWrite(batch, { ordered: false });
      migrated += batch.length;
    } catch (err: any) {
      const insertedCount = err?.result?.nInserted ?? 0;
      migrated += insertedCount;
      errors += batch.length - insertedCount;
      console.error(`[migration] Bulk write error:`, err?.message);
    }
  }

  console.log(`[migration] Complete. Migrated: ${migrated}, Errors: ${errors}`);
  await mongoose.disconnect();
}

// Run if executed directly
if (require.main === module) {
  migrate().catch((err) => {
    console.error("[migration] Fatal error:", err);
    process.exit(1);
  });
}

export { migrate };
