// src/models/alert.model.ts
import mongoose, { Document, Schema, Model } from "mongoose";

export interface IAlert extends Document {
  rule_id: string;
  api_id: string;
  created_at?: Date;
  state: "triggered" | "resolved";
  payload?: any;
}

const AlertSchema: Schema<IAlert> = new Schema({
  rule_id: { type: String, required: true },
  api_id: { type: String, required: true, index: true },
  created_at: { type: Date, default: Date.now },
  state: {
    type: String,
    enum: ["triggered", "resolved"],
    default: "triggered",
  },
  payload: { type: Schema.Types.Mixed },
});

const Alert: Model<IAlert> =
  mongoose.models.Alert || mongoose.model<IAlert>("Alert", AlertSchema);
export default Alert;
