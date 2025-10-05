const mongoose = require("mongoose");

const AlertSchema = new mongoose.Schema({
  rule_id: String,
  api_id: String,
  created_at: { type: Date, default: Date.now },
  state: { type: String, default: "triggered" },
  payload: mongoose.Schema.Types.Mixed,
});

module.exports = mongoose.model("Alert", AlertSchema);
