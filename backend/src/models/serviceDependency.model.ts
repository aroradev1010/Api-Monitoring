// src/models/serviceDependency.model.ts
import mongoose, { Document, Schema, Model } from "mongoose";

export interface ISuggestion {
  co_occurrence_count: number;
  confidence_pct: number;
  suggested_at: Date;
  confirmed_at: Date;
}

export interface IServiceDependency extends Document {
  from_service: string;
  to_service: string;
  relationship: "http_call" | "enqueues" | "reads_from";
  description: string | null;
  declared_by: "user" | "suggested_confirmed";
  suggestion?: ISuggestion | null;
  created_at: Date;
  updated_at: Date;
}

const SuggestionSubSchema = new Schema(
  {
    co_occurrence_count: { type: Number, required: true },
    confidence_pct: { type: Number, required: true },
    suggested_at: { type: Date, required: true },
    confirmed_at: { type: Date, required: true },
  },
  { _id: false }
);

const ServiceDependencySchema: Schema<IServiceDependency> = new Schema(
  {
    from_service: { type: String, required: true },
    to_service: { type: String, required: true },
    relationship: {
      type: String,
      enum: ["http_call", "enqueues", "reads_from"],
      required: true,
    },
    description: { type: String, default: null },
    declared_by: {
      type: String,
      enum: ["user", "suggested_confirmed"],
      default: "user",
    },
    suggestion: { type: SuggestionSubSchema, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

ServiceDependencySchema.index({ from_service: 1 });
ServiceDependencySchema.index({ to_service: 1 });

const ServiceDependency: Model<IServiceDependency> =
  mongoose.models.ServiceDependency ||
  mongoose.model<IServiceDependency>("ServiceDependency", ServiceDependencySchema);
export default ServiceDependency;
