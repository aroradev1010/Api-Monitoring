// backend/src/tests/api-delete-cascade.test.ts
import request from "supertest";
import app from "../app";
import { connectInMemoryMongo, stopInMemoryMongo } from "./test-setup";
import mongoose from "mongoose";
import Api from "../models/api.model";
import Metric from "../models/metric.model";
import Rule from "../models/rule.model";
import Alert from "../models/alert.model";

describe("API delete cascade", () => {
  beforeAll(async () => {
    await connectInMemoryMongo();
  });
  afterAll(async () => {
    await stopInMemoryMongo();
  });
  afterEach(async () => {
    const cols = await mongoose.connection.db.collections();
    for (const c of cols) await c.deleteMany({});
  });

  test("DELETE /v1/apis/:api_id removes API, metrics, rules, alerts", async () => {
    // create api
    const apiPayload = {
      api_id: "cascade-api",
      name: "Cascade API",
      base_url: "https://example.com",
      probe_interval: 30,
      expected_status: [200],
    };
    const apiRes = await request(app).post("/v1/apis").send(apiPayload);
    expect([200, 201]).toContain(apiRes.status);

    // create rule via rules controller
    await request(app).post("/v1/rules").send({
      rule_id: "cascade-rule",
      name: "Cascade rule",
      api_id: "cascade-api",
      type: "latency_gt",
      threshold: 100,
    });

    // create metric document
    const m = new Metric({
      api_id: "cascade-api",
      timestamp: new Date(),
      latency_ms: 200,
      status_code: 200,
    });
    await m.save();

    // create an alert referencing that rule/api
    const a = new Alert({
      rule_id: "cascade-rule",
      api_id: "cascade-api",
      state: "triggered",
      payload: { foo: "bar" },
    });
    await a.save();

    // sanity check counts
    expect(await Api.countDocuments({ api_id: "cascade-api" })).toBe(1);
    expect(await Rule.countDocuments({ api_id: "cascade-api" })).toBe(1);
    expect(await Metric.countDocuments({ api_id: "cascade-api" })).toBe(1);
    expect(await Alert.countDocuments({ api_id: "cascade-api" })).toBe(1);

    // call delete API endpoint
    const del = await request(app).delete("/v1/apis/cascade-api");
    expect([200, 204]).toContain(del.status);

    // wait a tiny bit if delete does async sub-deletes (but controller should be sync)
    // check removal
    expect(await Api.countDocuments({ api_id: "cascade-api" })).toBe(0);
    expect(await Rule.countDocuments({ api_id: "cascade-api" })).toBe(0);
    expect(await Metric.countDocuments({ api_id: "cascade-api" })).toBe(0);
    expect(await Alert.countDocuments({ api_id: "cascade-api" })).toBe(0);
  });
});
