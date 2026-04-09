// sdk/__tests__/integration.test.ts
import { init, _resetForTesting } from "../src/init";
import { track } from "../src/track";
import { trackCron } from "../src/trackCron";
import { captureContext } from "../src/captureContext";
import {
  createRootContext,
  runWithContext,
  getContext,
} from "../src/context";
import type { EventPayload } from "../src/types";

const emittedEvents: EventPayload[] = [];
const mockAdd = jest.fn((event: EventPayload) => {
  emittedEvents.push(event);
});

jest.mock("../src/buffer", () => ({
  EventBuffer: jest.fn().mockImplementation(() => ({
    add: mockAdd,
    flush: jest.fn(),
    drain: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe("Integration: Context Propagation", () => {
  beforeEach(() => {
    mockAdd.mockClear();
    emittedEvents.length = 0;
    _resetForTesting();
    init({ apiKey: "test-key", service: "test-svc" });
  });

  afterEach(() => {
    _resetForTesting();
  });

  it("forms correct parent-child chain: HTTP → track → track", async () => {
    const root = createRootContext("test-svc", "cid-abc");

    await runWithContext(root, async () => {
      const rootCtx = getContext()!;

      await track("step1", async () => {
        const step1Ctx = getContext()!;
        expect(step1Ctx.depth).toBe(1);
        expect(step1Ctx.correlationId).toBe("cid-abc");

        await track("step2", async () => {
          const step2Ctx = getContext()!;
          expect(step2Ctx.depth).toBe(2);
          expect(step2Ctx.correlationId).toBe("cid-abc");
        });
      });
    });

    // Verify chain (excluding sdk.init event)
    const events = emittedEvents.filter((e) => e.operation !== "sdk.init");
    expect(events).toHaveLength(2);

    const step1 = events.find((e) => e.operation === "step1")!;
    const step2 = events.find((e) => e.operation === "step2")!;

    // step1's parent is root
    expect(step1.parent_event_id).toBe(root.currentEventId);
    expect(step1.correlation_id).toBe("cid-abc");

    // step2's parent is step1
    expect(step2.parent_event_id).toBe(step1.event_id);
    expect(step2.correlation_id).toBe("cid-abc");
  });

  it("cron always creates a new correlationId", async () => {
    const cronFn = trackCron("cleanup", async () => {
      expect(getContext()!.depth).toBe(0);
    });

    await cronFn();
    await cronFn();

    const cronEvents = emittedEvents.filter(
      (e) => e.kind === "cron_execution"
    );
    expect(cronEvents).toHaveLength(2);
    expect(cronEvents[0].correlation_id).not.toBe(
      cronEvents[1].correlation_id
    );
    expect(cronEvents[0].parent_event_id).toBeNull();
    expect(cronEvents[1].parent_event_id).toBeNull();
  });

  it("captureContext preserves context across async boundaries", async () => {
    const root = createRootContext("test-svc", "cid-cap");

    let captured: ReturnType<typeof captureContext>;
    runWithContext(root, () => {
      captured = captureContext();
    });

    // Outside ALS — context is gone
    expect(getContext()).toBeNull();

    // Restore via captured
    const restoredCtx = captured!.run(() => getContext());
    expect(restoredCtx).not.toBeNull();
    expect(restoredCtx!.correlationId).toBe("cid-cap");
  });

  it("all events have required tags (env, service)", async () => {
    const root = createRootContext("test-svc");
    await runWithContext(root, () =>
      track("tagged", async () => "ok")
    );

    const events = emittedEvents.filter((e) => e.operation !== "sdk.init");
    for (const event of events) {
      expect(event.tags.env).toBeDefined();
      expect(event.tags.service).toBe("test-svc");
    }
  });

  it("all events have sdk_version and api_key", () => {
    for (const event of emittedEvents) {
      expect(event.sdk_version).toBe("0.1.0");
      expect(event.api_key).toBe("test-key");
    }
  });
});
