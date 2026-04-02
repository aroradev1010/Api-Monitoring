// backend/src/tests/ruleEngine.unit.test.ts
import { connectInMemoryMongo, stopInMemoryMongo } from "./test-setup";
import mongoose from "mongoose";
import Api from "../models/api.model";
import Rule from "../models/rule.model";
import Event from "../models/event.model";
import Alert from "../models/alert.model";
import { evaluateRulesForEvent } from "../services/ruleEngine";

describe("Rule engine (unit/integration)", () => {
  beforeAll(async () => await connectInMemoryMongo());
  afterAll(async () => await stopInMemoryMongo());
  afterEach(async () => {
    const cols = await mongoose.connection.db.collections();
    for (const c of cols) await c.deleteMany({});
  });

  test("evaluateRulesForEvent triggers and resolves alerts for latency_gt", async () => {
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

    // create an event that should trigger
    const now = new Date();
    const event1 = new Event({
      service: "rengine-api",
      kind: "http_request",
      operation: "https://example.com",
      status: "ok",
      latency_ms: 1000,
      started_at: now,
      ended_at: new Date(now.getTime() + 1000),
      http: {
        method: "GET",
        path: "/",
        status_code: 200,
        target_url: "https://example.com",
      },
      tags: {},
      received_at: now,
      api_key: "default",
    });
    await event1.save();

    // evaluate
    await evaluateRulesForEvent(event1);

    // assert an alert exists in triggered state
    let a = await Alert.findOne({
      rule_id: "rengine-rule",
      api_id: "rengine-api",
    }).lean();
    expect(a).toBeTruthy();
    expect(a?.state).toBe("triggered");

    // now a good event to resolve
    const now2 = new Date();
    const event2 = new Event({
      service: "rengine-api",
      kind: "http_request",
      operation: "https://example.com",
      status: "ok",
      latency_ms: 50,
      started_at: now2,
      ended_at: new Date(now2.getTime() + 50),
      http: {
        method: "GET",
        path: "/",
        status_code: 200,
        target_url: "https://example.com",
      },
      tags: {},
      received_at: now2,
      api_key: "default",
    });
    await event2.save();
    await evaluateRulesForEvent(event2);

    const resolved = await Alert.findOne({
      rule_id: "rengine-rule",
      api_id: "rengine-api",
      state: "resolved",
    }).lean();
    expect(resolved).toBeTruthy();
  });
});
