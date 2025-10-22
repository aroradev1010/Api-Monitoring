// backend/src/tests/rules.test.ts
import request from "supertest";
import { connectInMemoryMongo, stopInMemoryMongo } from "./test-setup";
import mongoose from "mongoose";
import app from "../app"; // same import pattern as api.test.ts

describe("Rules API", () => {
  // keep same payload shape as your controller expects
  const rule = {
    rule_id: "r-test-1",
    name: "Test rule",
    api_id: null,
    type: "latency_gt",
    threshold: 1000,
  };

  beforeAll(async () => {
    // start in-memory mongo and connect mongoose
    await connectInMemoryMongo();
  });

  afterAll(async () => {
    // stop in-memory mongo and close mongoose
    await stopInMemoryMongo();
  });

  afterEach(async () => {
    // clear DB between tests (same pattern as api.test.ts)
    const collections = await mongoose.connection.db.collections();
    for (const c of collections) {
      await c.deleteMany({});
    }
  });

  test("POST /v1/rules creates a rule and GET /v1/rules lists it", async () => {
    const res = await request(app)
      .post("/v1/rules")
      .send(rule)
      .set("Accept", "application/json");
    expect([200, 201]).toContain(res.status);

    const list = await request(app).get("/v1/rules");
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body)).toBeTruthy();
    expect(list.body.some((r: any) => r.rule_id === rule.rule_id)).toBe(true);
  });

  test("DELETE /v1/rules/:id deletes rule", async () => {
    await request(app).post("/v1/rules").send(rule);
    const del = await request(app).delete(`/v1/rules/${rule.rule_id}`);
    expect([200, 204]).toContain(del.status);

    const list = await request(app).get("/v1/rules");
    expect(list.status).toBe(200);
    expect(list.body.some((r: any) => r.rule_id === rule.rule_id)).toBe(false);
  });
});
