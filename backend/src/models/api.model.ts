// src/models/api.model.ts
import mongoose, { Document, Schema, Model } from "mongoose";

export interface IApi extends Document {
  api_id: string;
  name: string;
  base_url: string;
  probe_interval?: number;
  expected_status?: number[];
  created_at?: Date;
}

const ApiSchema: Schema<IApi> = new Schema({
  api_id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  base_url: { type: String, required: true },
  probe_interval: { type: Number, default: 30 },
  expected_status: { type: [Number], default: [200] },
  created_at: { type: Date, default: Date.now },
});

const Api: Model<IApi> =
  mongoose.models.Api || mongoose.model<IApi>("Api", ApiSchema);
export default Api;
