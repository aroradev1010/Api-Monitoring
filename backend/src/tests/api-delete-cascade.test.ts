// backend/src/tests/api-delete-cascade.test.ts
import request from "supertest";
import app from "../app";
import { connectInMemoryMongo, stopInMemoryMongo } from "./test-setup";
import mongoose from "mongoose";
import Api from "../models/api.model";
import Event from "../models/event.model";
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

  test("DELETE /v1/apis/:api_id removes API, events, rules, alerts", async () => {
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

    // create event document (directly, not via HTTP)
    const now = new Date();
    const e = new Event({
      service: "cascade-api",
      kind: "http_request",
      operation: "https://example.com",
      status: "ok",
      latency_ms: 200,
      started_at: now,
      ended_at: new Date(now.getTime() + 200),
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
    await e.save();

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
    expect(await Event.countDocuments({ service: "cascade-api" })).toBe(1);
    expect(await Alert.countDocuments({ api_id: "cascade-api" })).toBe(1);

    // call delete API endpoint
    const del = await request(app).delete("/v1/apis/cascade-api");
    expect([200, 204]).toContain(del.status);

    // check removal
    expect(await Api.countDocuments({ api_id: "cascade-api" })).toBe(0);
    expect(await Rule.countDocuments({ api_id: "cascade-api" })).toBe(0);
    expect(await Event.countDocuments({ service: "cascade-api" })).toBe(0);
    expect(await Alert.countDocuments({ api_id: "cascade-api" })).toBe(0);
  });
});
