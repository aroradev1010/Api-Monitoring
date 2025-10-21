import request from "supertest";
import { connectInMemoryMongo, stopInMemoryMongo } from "./test-setup";
import mongoose from "mongoose";
import app from "../app";

describe("Metric routes", () => {
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

  test("POST /v1/metrics accepts metric when API registered", async () => {
    // register API first
    await request(app)
      .post("/v1/apis")
      .send({
        api_id: "metric-api",
        name: "Metric API",
        base_url: "https://example.com",
        probe_interval: 10,
        expected_status: [200],
      });

    const metric = {
      api_id: "metric-api",
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

    // fetch metrics
    const getRes = await request(app)
      .get("/v1/metrics")
      .query({ api_id: "metric-api", limit: 10 });
    expect(getRes.status).toBe(200);
    const arr = getRes.body;
    expect(Array.isArray(arr)).toBeTruthy();
    expect(arr[0].api_id).toBe("metric-api");
    expect(arr[0].latency_ms).toBeDefined();
  });

  test("POST /v1/metrics returns 404 for unregistered API", async () => {
    const metric = {
      api_id: "no-such-api",
      timestamp: new Date(),
      latency_ms: 10,
      status_code: 500,
      error: "sim",
      tags: {},
    };
    const res = await request(app).post("/v1/metrics").send(metric);
    expect(res.status).toBe(404);
  });
});
