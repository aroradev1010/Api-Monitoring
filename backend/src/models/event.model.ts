// src/models/event.model.ts
import mongoose, { Document, Schema, Model } from "mongoose";
import { randomUUID } from "crypto";

export type EventKind = "http_request" | "job_execution" | "cron_execution" | "custom";
export type EventStatus = "ok" | "error" | "timeout";

export interface IEventHttp {
  method: string;
  path: string;
  status_code: number;
  target_url: string;
}

export interface IEventJob {
  queue: string | null;
  attempt: number;
  max_attempts: number;
}

export interface IEvent extends Document {
  event_id: string;

  service: string;
  kind: EventKind;
  operation: string;

  correlation_id: string | null;
  parent_event_id: string | null;

  status: EventStatus;
  latency_ms: number;
  error_code: string | null;
  error_message: string | null;

  started_at: Date;
  ended_at: Date;

  http?: IEventHttp;
  job?: IEventJob;

  tags: Record<string, string>;

  received_at: Date;
  sdk_version: string | null;
  api_key: string;
}

const HttpSubSchema = new Schema(
  {
    method: { type: String, required: true },
    path: { type: String, required: true },
    status_code: { type: Number, required: true },
    target_url: { type: String, required: true },
  },
  { _id: false }
);

const JobSubSchema = new Schema(
  {
    queue: { type: String, default: null },
    attempt: { type: Number, required: true },
    max_attempts: { type: Number, required: true },
  },
  { _id: false }
);

const EventSchema: Schema<IEvent> = new Schema({
  event_id: { type: String, required: true, unique: true, default: randomUUID },

  service: { type: String, required: true },
  kind: {
    type: String,
    enum: ["http_request", "job_execution", "cron_execution", "custom"],
    required: true,
  },
  operation: { type: String, required: true },

  correlation_id: { type: String, default: null },
  parent_event_id: { type: String, default: null },

  status: {
    type: String,
    enum: ["ok", "error", "timeout"],
    required: true,
  },
  latency_ms: { type: Number, required: true },
  error_code: { type: String, default: null },
  error_message: { type: String, default: null },

  started_at: { type: Date, required: true },
  ended_at: { type: Date, required: true },

  http: { type: HttpSubSchema, default: undefined },
  job: { type: JobSubSchema, default: undefined },

  tags: { type: Schema.Types.Mixed, default: {} },

  received_at: { type: Date, required: true, default: Date.now },
  sdk_version: { type: String, default: null },
  api_key: { type: String, required: true, default: "default" },
});

// Required indexes per decision doc
EventSchema.index({ service: 1, started_at: -1 });
EventSchema.index({ correlation_id: 1, started_at: 1 });
EventSchema.index({ status: 1, started_at: -1 });
// TTL index: 30 day retention
EventSchema.index({ started_at: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const Event: Model<IEvent> =
  mongoose.models.Event || mongoose.model<IEvent>("Event", EventSchema);
export default Event;
