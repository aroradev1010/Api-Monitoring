// src/models/explanation.model.ts
import mongoose, { Document, Schema, Model } from "mongoose";
import { randomUUID } from "crypto";

export type ExplanationKind =
  | "single_failure"
  | "upstream_caused"
  | "cascade"
  | "timeout_chain"
  | "unresolved";

export type EventRole = "root_cause" | "propagation" | "consequence" | "context";

export interface ICausalChainNode {
  event_id: string;
  service: string;
  operation: string;
  status: string;
  latency_ms: number;
  started_at: Date;
  error_code: string | null;
  error_message: string | null;
  role: EventRole;
  parent_event_id: string | null;
  linked_to: string | null; // event_id of previous node in chain
}

export interface IRootCause {
  service: string;
  operation: string;
  status: string;
  error_code: string | null;
  error_message: string | null;
  latency_ms: number;
  started_at: Date;
}

export interface IExplanation extends Document {
  explanation_id: string;
  correlation_id: string | null;
  group_id: string;
  event_ids: string[];
  kind: ExplanationKind;
  confidence: "high" | "low";
  confidence_reason: string;
  summary: string;
  detail: string;
  causal_chain: ICausalChainNode[];
  root_cause: IRootCause | null;
  affected_services: string[];
  failure_started_at: Date;
  failure_ended_at: Date | null;
  total_duration_ms: number | null;
  created_at: Date;
  event_count: number;
}

const CausalChainNodeSchema = new Schema(
  {
    event_id: { type: String, required: true },
    service: { type: String, required: true },
    operation: { type: String, required: true },
    status: { type: String, required: true },
    latency_ms: { type: Number, required: true },
    started_at: { type: Date, required: true },
    error_code: { type: String, default: null },
    error_message: { type: String, default: null },
    role: {
      type: String,
      enum: ["root_cause", "propagation", "consequence", "context"],
      required: true,
    },
    parent_event_id: { type: String, default: null },
    linked_to: { type: String, default: null },
  },
  { _id: false }
);

const RootCauseSchema = new Schema(
  {
    service: { type: String, required: true },
    operation: { type: String, required: true },
    status: { type: String, required: true },
    error_code: { type: String, default: null },
    error_message: { type: String, default: null },
    latency_ms: { type: Number, required: true },
    started_at: { type: Date, required: true },
  },
  { _id: false }
);

const ExplanationSchema: Schema<IExplanation> = new Schema({
  explanation_id: { type: String, required: true, unique: true, default: randomUUID },
  correlation_id: { type: String, default: null },
  group_id: { type: String, required: true },
  event_ids: { type: [String], default: [] },
  kind: {
    type: String,
    enum: ["single_failure", "upstream_caused", "cascade", "timeout_chain", "unresolved"],
    required: true,
  },
  confidence: {
    type: String,
    enum: ["high", "low"],
    required: true,
  },
  confidence_reason: { type: String, required: true },
  summary: { type: String, required: true },
  detail: { type: String, required: true },
  causal_chain: { type: [CausalChainNodeSchema], default: [] },
  root_cause: { type: RootCauseSchema, default: null },
  affected_services: { type: [String], default: [] },
  failure_started_at: { type: Date, required: true },
  failure_ended_at: { type: Date, default: null },
  total_duration_ms: { type: Number, default: null },
  created_at: { type: Date, default: Date.now },
  event_count: { type: Number, required: true },
});

ExplanationSchema.index({ group_id: 1 });
ExplanationSchema.index({ correlation_id: 1 });
ExplanationSchema.index({ created_at: -1 });
ExplanationSchema.index({ affected_services: 1, created_at: -1 });

const Explanation: Model<IExplanation> =
  mongoose.models.Explanation ||
  mongoose.model<IExplanation>("Explanation", ExplanationSchema);
export default Explanation;
