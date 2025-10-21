import request from "supertest";
import { connectInMemoryMongo, stopInMemoryMongo } from "./test-setup";
import mongoose from "mongoose";
import app from "../app";

describe("API routes", () => {
  beforeAll(async () => {
    await connectInMemoryMongo();
  });

  afterAll(async () => {
    await stopInMemoryMongo();
  });

  afterEach(async () => {
    // clean DB between tests
    const collections = await mongoose.connection.db.collections();
    for (const c of collections) {
      await c.deleteMany({});
    }
  });

  test("POST /v1/apis creates an API and GET /v1/apis lists it", async () => {
    const payload = {
      api_id: "test-api",
      name: "Test API",
      base_url: "https://example.com",
      probe_interval: 30,
      expected_status: [200],
    };

    const resPost = await request(app)
      .post("/v1/apis")
      .send(payload)
      .set("Accept", "application/json");
    expect([200, 201]).toContain(resPost.status);

    const resGet = await request(app).get("/v1/apis");
    expect(resGet.status).toBe(200);
    const list = resGet.body;
    expect(Array.isArray(list)).toBeTruthy();
    expect(list.some((a: any) => a.api_id === payload.api_id)).toBeTruthy();
  });

  test("POST /v1/apis returns 409 on duplicate api_id", async () => {
    const payload = {
      api_id: "dup-api",
      name: "Dup API",
      base_url: "https://example.com",
    };
    await request(app).post("/v1/apis").send(payload);
    const resDup = await request(app).post("/v1/apis").send(payload);
    expect(resDup.status).toBe(409);
  });
});
