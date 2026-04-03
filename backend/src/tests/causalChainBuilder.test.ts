// src/tests/causalChainBuilder.test.ts
import { buildChain } from "../services/causalChainBuilder";
import { IEvent } from "../models/event.model";

function makeEvent(overrides: Partial<IEvent> = {}): IEvent {
  return {
    event_id: "evt-" + Math.random().toString(36).slice(2, 8),
    service: "svc-a",
    kind: "http_request",
    operation: "https://example.com",
    correlation_id: "corr-1",
    parent_event_id: null,
    status: "ok",
    latency_ms: 100,
    error_code: null,
    error_message: null,
    started_at: new Date("2025-01-01T10:00:00Z"),
    ended_at: new Date("2025-01-01T10:00:00.100Z"),
    http: { method: "GET", path: "/", status_code: 200, target_url: "https://example.com" },
    tags: {},
    received_at: new Date(),
    sdk_version: null,
    api_key: "default",
    ...overrides,
  } as any;
}

describe("Causal Chain Builder", () => {
  test("sorts events by started_at ascending", () => {
    const e1 = makeEvent({ event_id: "e1", started_at: new Date("2025-01-01T10:00:02Z") });
    const e2 = makeEvent({ event_id: "e2", started_at: new Date("2025-01-01T10:00:00Z") });
    const e3 = makeEvent({ event_id: "e3", started_at: new Date("2025-01-01T10:00:01Z") });

    const chain = buildChain([e1, e2, e3]);
    expect(chain.map((n) => n.event_id)).toEqual(["e2", "e3", "e1"]);
  });

  test("assigns root_cause to first failure event", () => {
    const events = [
      makeEvent({ event_id: "e1", started_at: new Date("2025-01-01T10:00:00Z"), status: "ok" }),
      makeEvent({ event_id: "e2", started_at: new Date("2025-01-01T10:00:01Z"), status: "error", error_code: "TIMEOUT" }),
      makeEvent({ event_id: "e3", started_at: new Date("2025-01-01T10:00:02Z"), status: "error" }),
    ];

    const chain = buildChain(events);
    expect(chain[0].role).toBe("context"); // e1 before root
    expect(chain[1].role).toBe("root_cause"); // e2 is first failure
    expect(chain[2].role).toBe("propagation"); // e3 after root, not ok
  });

  test("assigns consequence to ok events after root cause", () => {
    const events = [
      makeEvent({ event_id: "e1", started_at: new Date("2025-01-01T10:00:00Z"), status: "error" }),
      makeEvent({ event_id: "e2", started_at: new Date("2025-01-01T10:00:01Z"), status: "ok" }),
    ];

    const chain = buildChain(events);
    expect(chain[0].role).toBe("root_cause");
    expect(chain[1].role).toBe("consequence");
  });

  test("all context when no failures", () => {
    const events = [
      makeEvent({ event_id: "e1", status: "ok" }),
      makeEvent({ event_id: "e2", status: "ok" }),
    ];

    const chain = buildChain(events);
    expect(chain.every((n) => n.role === "context")).toBe(true);
  });

  test("links via parent_event_id when present", () => {
    const events = [
      makeEvent({ event_id: "e1", started_at: new Date("2025-01-01T10:00:00Z") }),
      makeEvent({ event_id: "e2", started_at: new Date("2025-01-01T10:00:01Z"), parent_event_id: "e1" }),
    ];

    const chain = buildChain(events);
    expect(chain[0].linked_to).toBeNull(); // first event has no link
    expect(chain[1].linked_to).toBe("e1"); // linked via parent
  });

  test("links to previous event when no parent_event_id", () => {
    const events = [
      makeEvent({ event_id: "e1", started_at: new Date("2025-01-01T10:00:00Z") }),
      makeEvent({ event_id: "e2", started_at: new Date("2025-01-01T10:00:01Z") }),
    ];

    const chain = buildChain(events);
    expect(chain[1].linked_to).toBe("e1"); // linked to previous
  });

  test("caps chain at 50 events", () => {
    const events = Array.from({ length: 60 }, (_, i) =>
      makeEvent({
        event_id: `e${i}`,
        started_at: new Date(Date.now() + i * 1000),
      })
    );

    const chain = buildChain(events);
    expect(chain.length).toBe(50);
  });

  test("handles empty input", () => {
    expect(buildChain([])).toEqual([]);
  });
});
