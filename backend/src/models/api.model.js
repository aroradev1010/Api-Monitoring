const mongoose = require("mongoose");

const ApiSchema = new mongoose.Schema({
  api_id: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  base_url: { type: String, required: true },
  probe_interval: { type: Number, default: 30 },
  expected_status: { type: [Number], default: [200] },
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Api", ApiSchema);
