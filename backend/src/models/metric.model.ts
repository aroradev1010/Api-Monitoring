// src/models/metric.model.ts
import mongoose, { Document, Schema, Model } from "mongoose";

export interface IMetric extends Document {
  api_id: string;
  timestamp: Date;
  latency_ms: number;
  status_code: number;
  error?: string | null;
  tags?: Record<string, any>;
}

const MetricSchema: Schema<IMetric> = new Schema({
  api_id: { type: String, required: true, index: true },
  timestamp: { type: Date, required: true, default: Date.now },
  latency_ms: { type: Number, required: true },
  status_code: { type: Number, required: true },
  error: { type: String, default: null },
  tags: { type: Schema.Types.Mixed },
});

// index for querying latest metrics by api_id quickly
MetricSchema.index({ api_id: 1, timestamp: -1 });

const Metric: Model<IMetric> =
  mongoose.models.Metric || mongoose.model<IMetric>("Metric", MetricSchema);
export default Metric;
