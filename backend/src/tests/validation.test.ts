// backend/src/tests/validation.test.ts
import request from "supertest";
import app from "../app";
import { connectInMemoryMongo, stopInMemoryMongo } from "./test-setup";
import mongoose from "mongoose";

describe("Validation middleware", () => {
  beforeAll(async () => await connectInMemoryMongo());
  afterAll(async () => await stopInMemoryMongo());
  afterEach(async () => {
    const cols = await mongoose.connection.db.collections();
    for (const c of cols) await c.deleteMany({});
  });

  test("POST /v1/metrics returns 400 for missing required fields", async () => {
    const badMetric = { api_id: "x" /* missing latency_ms and status_code */ };
    const res = await request(app).post("/v1/metrics").send(badMetric);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  test("POST /v1/rules returns 400 for invalid payload (threshold missing)", async () => {
    const badRule = {
      rule_id: "bad",
      name: "Bad",
      // missing threshold & type
    };
    const res = await request(app).post("/v1/rules").send(badRule);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  test("POST /v1/rules allows api_id null", async () => {
    const ok = {
      rule_id: "global-rule",
      name: "Global",
      api_id: null,
      type: "latency_gt",
      threshold: 100,
    };
    const res = await request(app).post("/v1/rules").send(ok);
    expect([200, 201]).toContain(res.status);
  });
});
