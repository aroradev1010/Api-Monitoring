// backend/src/tests/migration.test.ts
import { mapMetricToEvent } from "../scripts/migrate-metrics-to-events";
import { IMetric } from "../models/metric.model";

describe("Migration: Metric → Event mapping", () => {
  function makeMetric(overrides: Partial<IMetric> = {}): IMetric {
    return {
      api_id: "test-api",
      timestamp: new Date("2025-01-15T10:00:00Z"),
      latency_ms: 250,
      status_code: 200,
      error: null,
      error_type: "none",
      tags: { target: "https://example.com/api" },
      ...overrides,
    } as IMetric;
  }

  test("maps basic fields correctly", () => {
    const m = makeMetric();
    const e = mapMetricToEvent(m);

    expect(e.service).toBe("test-api");
    expect(e.kind).toBe("http_request");
    expect(e.latency_ms).toBe(250);
    expect(e.operation).toBe("https://example.com/api");
    expect(e.correlation_id).toBeNull();
    expect(e.parent_event_id).toBeNull();
    expect(e.sdk_version).toBeNull();
    expect(e.api_key).toBe("default");
    expect(e.event_id).toBeDefined();
    expect(typeof e.event_id).toBe("string");
  });

  test("computes started_at and ended_at", () => {
    const m = makeMetric({
      timestamp: new Date("2025-01-15T10:00:00Z"),
      latency_ms: 500,
    });
    const e = mapMetricToEvent(m);

    expect(new Date(e.started_at).toISOString()).toBe("2025-01-15T10:00:00.000Z");
    expect(new Date(e.ended_at).toISOString()).toBe("2025-01-15T10:00:00.500Z");
  });

  test("maps status_code >= 500 to status 'error'", () => {
    const m = makeMetric({ status_code: 502, error_type: "http_error" });
    const e = mapMetricToEvent(m);

    expect(e.status).toBe("error");
    expect(e.error_code).toBe("HTTP_ERROR");
    expect(e.http?.status_code).toBe(502);
  });

  test("maps error_type 'timeout' to status 'timeout'", () => {
    const m = makeMetric({
      status_code: 0,
      error_type: "timeout",
      error: "Request timed out",
    });
    const e = mapMetricToEvent(m);

    expect(e.status).toBe("timeout");
    expect(e.error_code).toBe("TIMEOUT");
    expect(e.error_message).toBe("Request timed out");
  });

  test("maps normal response to status 'ok'", () => {
    const m = makeMetric({ status_code: 200, error_type: "none" });
    const e = mapMetricToEvent(m);

    expect(e.status).toBe("ok");
    expect(e.error_code).toBeNull();
    expect(e.error_message).toBeNull();
  });

  test("maps error_type 'network' correctly", () => {
    const m = makeMetric({
      status_code: 0,
      error_type: "network",
      error: "ECONNREFUSED",
    });
    const e = mapMetricToEvent(m);

    expect(e.status).toBe("ok"); // status_code 0 < 500 and not timeout
    expect(e.error_code).toBe("NETWORK");
    expect(e.error_message).toBe("ECONNREFUSED");
  });

  test("extracts http sub-doc from tags.target", () => {
    const m = makeMetric({
      tags: { target: "https://example.com/api/v2/users" },
    });
    const e = mapMetricToEvent(m);

    expect(e.http?.method).toBe("GET");
    expect(e.http?.path).toBe("/api/v2/users");
    expect(e.http?.target_url).toBe("https://example.com/api/v2/users");
    expect(e.http?.status_code).toBe(200);
  });

  test("received_at uses metric timestamp", () => {
    const ts = new Date("2025-06-01T12:00:00Z");
    const m = makeMetric({ timestamp: ts });
    const e = mapMetricToEvent(m);

    expect(new Date(e.received_at).toISOString()).toBe(ts.toISOString());
  });

  test("generates unique event_id for each call", () => {
    const m = makeMetric();
    const e1 = mapMetricToEvent(m);
    const e2 = mapMetricToEvent(m);
    expect(e1.event_id).not.toBe(e2.event_id);
  });
});
