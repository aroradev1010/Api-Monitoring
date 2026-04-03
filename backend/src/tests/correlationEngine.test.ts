// src/tests/correlationEngine.test.ts
import { connectInMemoryMongo, stopInMemoryMongo } from "./test-setup";
import mongoose from "mongoose";
import { attachEvent, _resetAll, _getGroup, getActiveGroupCount } from "../services/correlationEngine";
import Event, { IEvent } from "../models/event.model";
import Explanation from "../models/explanation.model";
import Api from "../models/api.model";
import ServiceDependency from "../models/serviceDependency.model";

jest.setTimeout(30000);

function makeEvent(overrides: Partial<IEvent> = {}): IEvent {
  const now = new Date();
  return new Event({
    service: "svc-a",
    kind: "http_request",
    operation: "https://example.com",
    correlation_id: "test-corr-1",
    parent_event_id: null,
    status: "ok",
    latency_ms: 100,
    error_code: null,
    error_message: null,
    started_at: now,
    ended_at: new Date(now.getTime() + 100),
    http: { method: "GET", path: "/", status_code: 200, target_url: "https://example.com" },
    tags: {},
    received_at: now,
    api_key: "default",
    ...overrides,
  });
}

describe("Correlation Engine", () => {
  beforeAll(async () => {
    await connectInMemoryMongo();
  });

  afterAll(async () => {
    _resetAll();
    await stopInMemoryMongo();
  });

  afterEach(async () => {
    _resetAll();
    const cols = await mongoose.connection.db.collections();
    for (const c of cols) await c.deleteMany({});
  });

  test("creates a group when event with correlation_id is attached", () => {
    const e = makeEvent({ correlation_id: "grp-1" });
    attachEvent(e);
    expect(getActiveGroupCount()).toBe(1);
    const group = _getGroup("grp-1");
    expect(group).toBeDefined();
    expect(group!.events.length).toBe(1);
    expect(group!.has_failure).toBe(false);
  });

  test("sets has_failure when a failure event is attached", () => {
    const e1 = makeEvent({ correlation_id: "grp-2", status: "ok" });
    const e2 = makeEvent({ correlation_id: "grp-2", status: "error", error_code: "TIMEOUT" });
    attachEvent(e1);
    attachEvent(e2);
    const group = _getGroup("grp-2");
    expect(group!.has_failure).toBe(true);
    expect(group!.events.length).toBe(2);
  });

  test("accumulates events in same group", () => {
    for (let i = 0; i < 5; i++) {
      attachEvent(makeEvent({ correlation_id: "grp-3" }));
    }
    const group = _getGroup("grp-3");
    expect(group!.events.length).toBe(5);
  });

  test("force-closes group at max size (100)", () => {
    for (let i = 0; i < 100; i++) {
      attachEvent(makeEvent({ correlation_id: "grp-big" }));
    }
    // Group should be force-closed and removed
    expect(_getGroup("grp-big")).toBeUndefined();
    expect(getActiveGroupCount()).toBe(0);
  });

  test("closes group after 15s of inactivity and generates explanation for failures", async () => {
    // Register API so event ingestion works in pipeline context
    await new Api({
      api_id: "svc-a",
      name: "Service A",
      base_url: "https://example.com",
      probe_interval: 30,
      expected_status: [200],
    }).save();

    const e1 = makeEvent({ correlation_id: "grp-timeout", status: "error", error_code: "HTTP_ERROR" });
    await e1.save();
    attachEvent(e1);

    expect(getActiveGroupCount()).toBe(1);

    // Wait for 15s + buffer
    await new Promise((r) => setTimeout(r, 16000));

    // Group should be closed
    expect(getActiveGroupCount()).toBe(0);

    // Explanation should have been generated
    const explanations = await Explanation.find({ group_id: "grp-timeout" }).lean();
    expect(explanations.length).toBe(1);
    expect(explanations[0].kind).toBeDefined();
    expect(explanations[0].summary).toBeDefined();
    expect(explanations[0].confidence).toBeDefined();
  }, 25000);

  test("does NOT generate explanation for groups without failures", async () => {
    const e1 = makeEvent({ correlation_id: "grp-ok", status: "ok" });
    const e2 = makeEvent({ correlation_id: "grp-ok", status: "ok" });
    attachEvent(e1);
    attachEvent(e2);

    // Wait for group close
    await new Promise((r) => setTimeout(r, 16000));

    expect(getActiveGroupCount()).toBe(0);
    const explanations = await Explanation.find({ group_id: "grp-ok" }).lean();
    expect(explanations.length).toBe(0);
  }, 25000);

  test("does not create group for ok event without correlation_id", () => {
    const e = makeEvent({ correlation_id: null, status: "ok" });
    attachEvent(e);
    expect(getActiveGroupCount()).toBe(0);
  });

  test("fallback correlation creates explanation for failure without correlation_id", async () => {
    // Register APIs
    await new Api({
      api_id: "svc-front",
      name: "Frontend",
      base_url: "https://frontend.example.com",
      probe_interval: 30,
      expected_status: [200],
    }).save();
    await new Api({
      api_id: "svc-back",
      name: "Backend",
      base_url: "https://backend.example.com",
      probe_interval: 30,
      expected_status: [200],
    }).save();

    // Create dependency: svc-front → svc-back
    await ServiceDependency.create({
      from_service: "svc-front",
      to_service: "svc-back",
      relationship: "http_call",
      declared_by: "user",
    });

    // Save a failure event in svc-back (candidate)
    const candidateTime = new Date();
    const candidate = new Event({
      service: "svc-back",
      kind: "http_request",
      operation: "https://backend.example.com/api",
      correlation_id: null,
      status: "error",
      latency_ms: 500,
      started_at: candidateTime,
      ended_at: new Date(candidateTime.getTime() + 500),
      http: { method: "GET", path: "/api", status_code: 500, target_url: "https://backend.example.com/api" },
      tags: {},
      received_at: candidateTime,
      api_key: "default",
    });
    await candidate.save();

    // Now trigger with a failure event in svc-front (no correlation_id)
    const triggerTime = new Date(candidateTime.getTime() + 2000);
    const trigger = new Event({
      service: "svc-front",
      kind: "http_request",
      operation: "https://frontend.example.com/page",
      correlation_id: null,
      status: "error",
      latency_ms: 300,
      started_at: triggerTime,
      ended_at: new Date(triggerTime.getTime() + 300),
      http: { method: "GET", path: "/page", status_code: 502, target_url: "https://frontend.example.com/page" },
      tags: {},
      received_at: triggerTime,
      api_key: "default",
    });
    await trigger.save();

    // Attach will trigger fallback correlation
    attachEvent(trigger);

    // Wait for async fallback to complete
    await new Promise((r) => setTimeout(r, 2000));

    // Should have an explanation with low confidence
    const explanations = await Explanation.find({
      affected_services: "svc-front",
    }).lean();
    expect(explanations.length).toBeGreaterThanOrEqual(1);
    expect(explanations[0].confidence).toBe("low");
  }, 15000);
});
