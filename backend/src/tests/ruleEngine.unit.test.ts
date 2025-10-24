// backend/src/tests/ruleEngine.unit.test.ts
import { connectInMemoryMongo, stopInMemoryMongo } from "./test-setup";
import mongoose from "mongoose";
import Api from "../models/api.model";
import Rule from "../models/rule.model";
import Metric from "../models/metric.model";
import Alert from "../models/alert.model";
import { evaluateRulesForMetric } from "../services/ruleEngine";

describe("Rule engine (unit/integration)", () => {
  beforeAll(async () => await connectInMemoryMongo());
  afterAll(async () => await stopInMemoryMongo());
  afterEach(async () => {
    const cols = await mongoose.connection.db.collections();
    for (const c of cols) await c.deleteMany({});
  });

  test("evaluateRulesForMetric triggers and resolves alerts for latency_gt", async () => {
    // create api
    await new Api({
      api_id: "rengine-api",
      name: "R Engine API",
      base_url: "https://example.com",
      probe_interval: 30,
      expected_status: [200],
    }).save();

    // create rule: latency_gt 500
    await new Rule({
      rule_id: "rengine-rule",
      name: "latency > 500",
      api_id: "rengine-api",
      type: "latency_gt",
      threshold: 500,
    }).save();

    // ensure no alerts
    expect(await Alert.countDocuments({})).toBe(0);

    // create a metric that should trigger
    const metric1 = new Metric({
      api_id: "rengine-api",
      timestamp: new Date(),
      latency_ms: 1000,
      status_code: 200,
    });
    await metric1.save();

    // evaluate
    await evaluateRulesForMetric(metric1);

    // assert an alert exists in triggered state
    let a = await Alert.findOne({
      rule_id: "rengine-rule",
      api_id: "rengine-api",
    }).lean();
    expect(a).toBeTruthy();
    expect(a?.state).toBe("triggered");

    // now a good metric to resolve
    const metric2 = new Metric({
      api_id: "rengine-api",
      timestamp: new Date(),
      latency_ms: 50,
      status_code: 200,
    });
    await metric2.save();
    await evaluateRulesForMetric(metric2);

    const resolved = await Alert.findOne({
      rule_id: "rengine-rule",
      api_id: "rengine-api",
      state: "resolved",
    }).lean();
    expect(resolved).toBeTruthy();
  });
});
