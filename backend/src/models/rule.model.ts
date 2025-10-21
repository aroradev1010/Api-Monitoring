import mongoose, { Document, Schema, Model } from "mongoose";

export type RuleType = "latency_gt" | "status_not_in"; // simple rule types

export interface IRule extends Document {
  rule_id: string; // unique string id (human-friendly)
  name: string;
  api_id?: string | null; // if null -> applies to all APIs
  type: RuleType;
  threshold?: number; // for latency_gt
  ignored_status?: number[]; // for status_not_in (list of allowed statuses)
  active?: boolean; // allow disabling without deleting
  created_at?: Date;
}

const RuleSchema: Schema<IRule> = new Schema({
  rule_id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  api_id: { type: String, default: null },
  type: { type: String, required: true },
  threshold: { type: Number },
  ignored_status: { type: [Number], default: [] },
  active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
});

const Rule: Model<IRule> =
  mongoose.models.Rule || mongoose.model<IRule>("Rule", RuleSchema);
export default Rule;
