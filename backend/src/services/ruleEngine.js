const Alert = require("../models/alert.model");
const { notify } = require("./alertManager");

async function evaluateRulesForMetric(metric) {
  // Prototype rule: trigger alert when latency > 2000 ms
  if (metric.latency_ms > 2000) {
    const alert = new Alert({
      rule_id: "threshold-latency",
      api_id: metric.api_id,
      payload: metric,
    });
    await alert.save();
    await notify(alert).catch((err) => console.error("Notify failed", err));
  }
}

module.exports = { evaluateRulesForMetric };
