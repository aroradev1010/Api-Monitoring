// sdk/__tests__/track.test.ts
import { init, _resetForTesting } from "../src/init";
import { track } from "../src/track";
import { createRootContext, runWithContext, getContext } from "../src/context";
import { EventBuffer } from "../src/buffer";
import type { EventPayload } from "../src/types";

// Shared mock to capture all add() calls
const mockAdd = jest.fn();

jest.mock("../src/buffer", () => ({
  EventBuffer: jest.fn().mockImplementation(() => ({
    add: mockAdd,
    flush: jest.fn(),
    drain: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe("track()", () => {
  beforeEach(() => {
    mockAdd.mockClear();
    _resetForTesting();
    init({ apiKey: "test-key", service: "test-svc" });
  });

  afterEach(() => {
    _resetForTesting();
  });

  it("returns the value from fn", async () => {
    const ctx = createRootContext("test-svc");
    const result = await runWithContext(ctx, () =>
      track("compute", async () => 42)
    );
    expect(result).toBe(42);
  });

  it("re-throws errors from fn", async () => {
    const ctx = createRootContext("test-svc");
    await expect(
      runWithContext(ctx, () =>
        track("failing", async () => {
          throw new Error("boom");
        })
      )
    ).rejects.toThrow("boom");
  });

  it("emits an event with kind: custom", async () => {
    const ctx = createRootContext("test-svc");

    await runWithContext(ctx, () =>
      track("myOperation", async () => "ok")
    );

    const event = mockAdd.mock.calls
      .map((c: any[]) => c[0] as EventPayload)
      .find((e) => e.operation === "myOperation");

    expect(event).toBeDefined();
    expect(event!.kind).toBe("custom");
    expect(event!.operation).toBe("myOperation");
    expect(event!.correlation_id).toBe(ctx.correlationId);
    expect(event!.parent_event_id).toBe(ctx.currentEventId);
    expect(event!.status).toBe("ok");
  });

  it("emits error event when fn throws", async () => {
    const ctx = createRootContext("test-svc");

    try {
      await runWithContext(ctx, () =>
        track("failing", async () => {
          throw new Error("oops");
        })
      );
    } catch {}

    const event = mockAdd.mock.calls
      .map((c: any[]) => c[0] as EventPayload)
      .find((e) => e.operation === "failing");

    expect(event).toBeDefined();
    expect(event!.status).toBe("error");
    expect(event!.error_message).toBe("oops");
  });

  it("creates a child context inside fn", async () => {
    const root = createRootContext("test-svc");
    let innerDepth: number | undefined;

    await runWithContext(root, () =>
      track("nested", async () => {
        innerDepth = getContext()?.depth;
      })
    );

    expect(innerDepth).toBe(1); // child of root
  });

  it("adds _context_missing tag when called outside context", async () => {
    // Call without any ALS context
    await track("orphan", async () => "ok");

    const event = mockAdd.mock.calls
      .map((c: any[]) => c[0] as EventPayload)
      .find((e) => e.operation === "orphan");

    expect(event).toBeDefined();
    expect(event!.tags._context_missing).toBe("true");
    expect(event!.correlation_id).toBeNull();
    expect(event!.parent_event_id).toBeNull();
  });
});
