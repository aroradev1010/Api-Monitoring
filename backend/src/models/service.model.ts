// src/models/service.model.ts
import mongoose, { Document, Schema, Model } from "mongoose";

export interface IService extends Document {
  name: string;
  kind: "api" | "worker" | "cron" | "unknown";
  first_seen_at: Date;
  last_seen_at: Date;
  event_count: number;
}

const ServiceSchema: Schema<IService> = new Schema({
  name: { type: String, required: true, unique: true },
  kind: {
    type: String,
    enum: ["api", "worker", "cron", "unknown"],
    default: "unknown",
  },
  first_seen_at: { type: Date, required: true, default: Date.now },
  last_seen_at: { type: Date, required: true, default: Date.now },
  event_count: { type: Number, default: 0 },
});

const Service: Model<IService> =
  mongoose.models.Service || mongoose.model<IService>("Service", ServiceSchema);
export default Service;
