// src/tests/dependency.test.ts
import request from "supertest";
import { connectInMemoryMongo, stopInMemoryMongo } from "./test-setup";
import mongoose from "mongoose";
import app from "../app";
import Service from "../models/service.model";

describe("Dependency & Service APIs", () => {
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

  describe("POST /v1/dependencies", () => {
    test("creates a dependency", async () => {
      const res = await request(app)
        .post("/v1/dependencies")
        .send({
          from_service: "svc-a",
          to_service: "svc-b",
          relationship: "http_call",
          description: "A calls B",
        });
      expect(res.status).toBe(201);
      expect(res.body.from_service).toBe("svc-a");
      expect(res.body.to_service).toBe("svc-b");
      expect(res.body.relationship).toBe("http_call");
    });

    test("rejects self-dependency", async () => {
      const res = await request(app)
        .post("/v1/dependencies")
        .send({
          from_service: "svc-a",
          to_service: "svc-a",
          relationship: "http_call",
        });
      expect(res.status).toBe(400);
    });

    test("rejects duplicate dependency", async () => {
      await request(app)
        .post("/v1/dependencies")
        .send({
          from_service: "svc-a",
          to_service: "svc-b",
          relationship: "http_call",
        });
      const res = await request(app)
        .post("/v1/dependencies")
        .send({
          from_service: "svc-a",
          to_service: "svc-b",
          relationship: "http_call",
        });
      expect(res.status).toBe(409);
    });

    test("returns 400 for missing fields", async () => {
      const res = await request(app)
        .post("/v1/dependencies")
        .send({ from_service: "svc-a" });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /v1/dependencies", () => {
    test("returns all dependencies", async () => {
      await request(app)
        .post("/v1/dependencies")
        .send({ from_service: "svc-a", to_service: "svc-b", relationship: "http_call" });
      await request(app)
        .post("/v1/dependencies")
        .send({ from_service: "svc-b", to_service: "svc-c", relationship: "enqueues" });

      const res = await request(app).get("/v1/dependencies");
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
    });

    test("filters by service", async () => {
      await request(app)
        .post("/v1/dependencies")
        .send({ from_service: "svc-a", to_service: "svc-b", relationship: "http_call" });
      await request(app)
        .post("/v1/dependencies")
        .send({ from_service: "svc-c", to_service: "svc-d", relationship: "reads_from" });

      const res = await request(app).get("/v1/dependencies").query({ service: "svc-a" });
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].from_service).toBe("svc-a");
    });
  });

  describe("DELETE /v1/dependencies/:id", () => {
    test("deletes a dependency", async () => {
      const createRes = await request(app)
        .post("/v1/dependencies")
        .send({ from_service: "svc-a", to_service: "svc-b", relationship: "http_call" });
      const id = createRes.body._id;

      const delRes = await request(app).delete(`/v1/dependencies/${id}`);
      expect(delRes.status).toBe(204);

      // Verify gone
      const getRes = await request(app).get("/v1/dependencies");
      expect(getRes.body.length).toBe(0);
    });

    test("returns 404 for non-existent id", async () => {
      const fakeId = new mongoose.Types.ObjectId().toHexString();
      const res = await request(app).delete(`/v1/dependencies/${fakeId}`);
      expect(res.status).toBe(404);
    });
  });

  describe("GET /v1/services", () => {
    test("returns auto-created services", async () => {
      // Manually create service records (normally done by event controller)
      await Service.create({
        name: "svc-a",
        kind: "api",
        first_seen_at: new Date(),
        last_seen_at: new Date(),
        event_count: 5,
      });
      await Service.create({
        name: "svc-b",
        kind: "worker",
        first_seen_at: new Date(),
        last_seen_at: new Date(),
        event_count: 3,
      });

      const res = await request(app).get("/v1/services");
      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body[0].name).toBeDefined();
    });
  });
});
