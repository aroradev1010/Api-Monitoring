const mongoose = require("mongoose");

const MetricSchema = new mongoose.Schema({
  api_id: { type: String, required: true, index: true },
  timestamp: { type: Date, required: true },
  latency_ms: Number,
  status_code: Number,
  error: String,
  tags: mongoose.Schema.Types.Mixed,
});
MetricSchema.index({ api_id: 1, timestamp: -1 });

module.exports = mongoose.model("Metric", MetricSchema);
