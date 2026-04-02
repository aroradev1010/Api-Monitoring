// backend/src/tests/event.test.ts
import request from "supertest";
import { connectInMemoryMongo, stopInMemoryMongo } from "./test-setup";
import mongoose from "mongoose";
import app from "../app";

describe("Event routes", () => {
  beforeAll(async () => {
    await connectInMemoryMongo();
  });

  afterAll(async () => {
    await stopInMemoryMongo();
  });

  afterEach(async () => {
    const collections = await mongoose.connection.db.collections();
    for (const c of collections) {
      await c.deleteMany({});
    }
  });

  test("POST /v1/events accepts event when API registered", async () => {
    // register API first
    await request(app)
      .post("/v1/apis")
      .send({
        api_id: "event-api",
        name: "Event API",
        base_url: "https://example.com",
        probe_interval: 10,
        expected_status: [200],
      });

    const now = new Date();
    const event = {
      service: "event-api",
      kind: "http_request",
      operation: "https://example.com",
      status: "ok",
      latency_ms: 123,
      started_at: now.toISOString(),
      ended_at: new Date(now.getTime() + 123).toISOString(),
      http: {
        method: "GET",
        path: "/",
        status_code: 200,
        target_url: "https://example.com",
      },
      tags: { target: "https://example.com" },
    };

    const res = await request(app)
      .post("/v1/events")
      .send(event)
      .set("Accept", "application/json");
    expect(res.status).toBe(202);

    // fetch events
    const getRes = await request(app)
      .get("/v1/events")
      .query({ service: "event-api", limit: 10 });
    expect(getRes.status).toBe(200);
    const arr = getRes.body;
    expect(Array.isArray(arr)).toBeTruthy();
    expect(arr[0].service).toBe("event-api");
    expect(arr[0].latency_ms).toBeDefined();
    expect(arr[0].kind).toBe("http_request");
    expect(arr[0].http.status_code).toBe(200);
  });

  test("POST /v1/events returns 404 for unregistered service", async () => {
    const now = new Date();
    const event = {
      service: "no-such-api",
      kind: "http_request",
      operation: "https://example.com",
      status: "ok",
      latency_ms: 10,
      started_at: now.toISOString(),
      ended_at: new Date(now.getTime() + 10).toISOString(),
      http: {
        method: "GET",
        path: "/",
        status_code: 200,
        target_url: "https://example.com",
      },
      tags: {},
    };
    const res = await request(app).post("/v1/events").send(event);
    expect(res.status).toBe(404);
  });

  test("POST /v1/metrics (legacy) still works and stores as Event", async () => {
    // register API first
    await request(app)
      .post("/v1/apis")
      .send({
        api_id: "legacy-api",
        name: "Legacy API",
        base_url: "https://example.com",
        probe_interval: 10,
        expected_status: [200],
      });

    const metric = {
      api_id: "legacy-api",
      timestamp: new Date(),
      latency_ms: 123,
      status_code: 200,
      error: null,
      tags: { target: "https://example.com" },
    };

    const res = await request(app)
      .post("/v1/metrics")
      .send(metric)
      .set("Accept", "application/json");
    expect(res.status).toBe(202);

    // Should be queryable via /v1/events
    const getRes = await request(app)
      .get("/v1/events")
      .query({ service: "legacy-api", limit: 10 });
    expect(getRes.status).toBe(200);
    const arr = getRes.body;
    expect(Array.isArray(arr)).toBeTruthy();
    expect(arr[0].service).toBe("legacy-api");

    // Should also be queryable via legacy /v1/metrics
    const legacyRes = await request(app)
      .get("/v1/metrics")
      .query({ api_id: "legacy-api", limit: 10 });
    expect(legacyRes.status).toBe(200);
    const legacyArr = legacyRes.body;
    expect(legacyArr[0].api_id).toBe("legacy-api");
    expect(legacyArr[0].latency_ms).toBeDefined();
  });
});
