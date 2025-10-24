// backend/src/tests/ruleEngine.test.ts
import request from "supertest";
import { connectInMemoryMongo, stopInMemoryMongo } from "./test-setup";
import mongoose from "mongoose";
import Alert from "../models/alert.model";
import app from "../app";

jest.setTimeout(30000);

/**
 * Helper: poll for an alert with desired state.
 * Returns the alert doc if found within timeout, otherwise null.
 */
async function waitForAlert(
  ruleId: string,
  apiId: string,
  state: "triggered" | "resolved",
  timeout = 7000,
  interval = 200
) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const a = await Alert.findOne({
      rule_id: ruleId,
      api_id: apiId,
      state,
    }).lean();
    if (a) return a;
    // small sleep
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, interval));
  }
  return null;
}

describe("Rule Engine & Alerts (integration)", () => {
  const apiPayload = {
    api_id: "rule-test-api",
    name: "Rule Test API",
    base_url: "https://httpbin.org/delay/0",
    probe_interval: 30,
    expected_status: [200],
  };

  const rulePayload = {
    rule_id: "test-latency-rule",
    name: "Latency > 500ms",
    api_id: apiPayload.api_id,
    type: "latency_gt",
    threshold: 500,
  };

  beforeAll(async () => {
    await connectInMemoryMongo();
  });

  afterAll(async () => {
    await stopInMemoryMongo();
  });

  afterEach(async () => {
    // clear DB between tests
    const collections = await mongoose.connection.db.collections();
    for (const c of collections) {
      await c.deleteMany({});
    }
  });

  test("creates and resolves an alert for a latency_gt rule", async () => {
    // 1) create API
    const apires = await request(app).post("/v1/apis").send(apiPayload);

    expect([200, 201]).toContain(apires.status);

    // 2) create rule
    const rres = await request(app).post("/v1/rules").send(rulePayload);
    
    expect([200, 201]).toContain(rres.status);
    
    // Ensure no alerts exist initially
    let alerts = await Alert.find({
      rule_id: rulePayload.rule_id,
      api_id: rulePayload.api_id,
    });
    expect(alerts.length).toBe(0);
    
    // 3) send a bad metric that should trigger the alert (latency 1000ms > 500)
    const badMetric = {
      api_id: apiPayload.api_id,
      timestamp: new Date().toISOString(),
      latency_ms: 1000,
      status_code: 200,
      error: null,
      tags: {},
    };
    
    const mres1 = await request(app).post("/v1/metrics").send(badMetric);

    expect([200, 202]).toContain(mres1.status);

    // Wait for async rule engine to create the alert
    const triggered = await waitForAlert(
      rulePayload.rule_id,
      apiPayload.api_id,
      "triggered",
      7000,
      200
    );
    expect(triggered).not.toBeNull();
    if (triggered) {
      expect(triggered.rule_id).toBe(rulePayload.rule_id);
      expect(triggered.api_id).toBe(apiPayload.api_id);
      expect(triggered.state).toBe("triggered");
      expect(triggered.payload).toBeDefined();
    }

    // 4) send a good metric that resolves the alert (latency 50ms)
    const goodMetric = {
      api_id: apiPayload.api_id,
      timestamp: new Date().toISOString(),
      latency_ms: 50,
      status_code: 200,
      error: null,
      tags: {},
    };

    const mres2 = await request(app).post("/v1/metrics").send(goodMetric);
    expect([200, 202]).toContain(mres2.status);

    // Wait for resolution
    const resolved = await waitForAlert(
      rulePayload.rule_id,
      apiPayload.api_id,
      "resolved",
      7000,
      200
    );
    expect(resolved).not.toBeNull();
    if (resolved) {
      expect(resolved.rule_id).toBe(rulePayload.rule_id);
      expect(resolved.api_id).toBe(apiPayload.api_id);
      expect(resolved.state).toBe("resolved");
    }
  }, 20000);
});
