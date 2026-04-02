// src/tests/pubsub.unit.test.ts
import pubsub from "../services/pubsub";

describe("pubsub (unit) - EventEmitter style", () => {
  afterEach(() => {
    // nothing special — tests will remove listeners they add
  });

  test("on/emit receives published payload", async () => {
    const received: any[] = [];

    const handler = (p: any) => {
      received.push(p);
    };
    (pubsub as any).on("event", handler);

    // emit a couple messages
    (pubsub as any).emit("event", { service: "u1", latency_ms: 10 });
    (pubsub as any).emit("event", { service: "u2", latency_ms: 20 });

    // small delay to allow any async handlers to run (most emit is sync)
    await new Promise((r) => setTimeout(r, 10));

    expect(received.length).toBeGreaterThanOrEqual(2);
    expect(received[0]).toMatchObject({ service: "u1", latency_ms: 10 });
    expect(received[1]).toMatchObject({ service: "u2", latency_ms: 20 });

    // cleanup
    (pubsub as any).off("event", handler);
  });

  test("off stops receiving events", async () => {
    const received: any[] = [];
    const handler = (p: any) => {
      received.push(p);
    };
    (pubsub as any).on("alert", handler);

    (pubsub as any).emit("alert", { rule_id: "r1" });
    await new Promise((r) => setTimeout(r, 10));
    expect(received.length).toBe(1);

    // remove listener
    (pubsub as any).off("alert", handler);

    (pubsub as any).emit("alert", { rule_id: "r2" });
    await new Promise((r) => setTimeout(r, 10));
    // still length 1
    expect(received.length).toBe(1);
  });
});
