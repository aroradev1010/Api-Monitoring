// sdk/__tests__/context.test.ts
import {
  createRootContext,
  createChildContext,
  getContext,
  runWithContext,
} from "../src/context";

describe("CorrelationContext", () => {
  describe("createRootContext", () => {
    it("creates a root context with depth 0", () => {
      const ctx = createRootContext("test-service");
      expect(ctx.service).toBe("test-service");
      expect(ctx.depth).toBe(0);
      expect(ctx.correlationId).toBeDefined();
      expect(ctx.currentEventId).toBeDefined();
    });

    it("reuses provided correlationId", () => {
      const ctx = createRootContext("test-service", "existing-cid");
      expect(ctx.correlationId).toBe("existing-cid");
    });

    it("generates new correlationId when none provided", () => {
      const ctx1 = createRootContext("svc");
      const ctx2 = createRootContext("svc");
      expect(ctx1.correlationId).not.toBe(ctx2.correlationId);
    });

    it("returns a frozen (immutable) object", () => {
      const ctx = createRootContext("svc");
      expect(Object.isFrozen(ctx)).toBe(true);
      expect(() => {
        (ctx as any).depth = 99;
      }).toThrow();
    });
  });

  describe("createChildContext", () => {
    it("inherits correlationId and service from parent", () => {
      const parent = createRootContext("svc", "cid-123");
      const child = createChildContext(parent);
      expect(child.correlationId).toBe("cid-123");
      expect(child.service).toBe("svc");
    });

    it("increments depth by 1", () => {
      const parent = createRootContext("svc");
      const child = createChildContext(parent);
      expect(child.depth).toBe(1);

      const grandchild = createChildContext(child);
      expect(grandchild.depth).toBe(2);
    });

    it("generates a new currentEventId", () => {
      const parent = createRootContext("svc");
      const child = createChildContext(parent);
      expect(child.currentEventId).not.toBe(parent.currentEventId);
    });

    it("does NOT mutate the parent", () => {
      const parent = createRootContext("svc");
      const originalEid = parent.currentEventId;
      createChildContext(parent);
      expect(parent.currentEventId).toBe(originalEid);
      expect(parent.depth).toBe(0);
    });

    it("returns a frozen object", () => {
      const parent = createRootContext("svc");
      const child = createChildContext(parent);
      expect(Object.isFrozen(child)).toBe(true);
    });
  });

  describe("getContext / runWithContext", () => {
    it("returns null outside of any ALS context", () => {
      expect(getContext()).toBeNull();
    });

    it("returns the active context inside runWithContext", () => {
      const ctx = createRootContext("svc");
      runWithContext(ctx, () => {
        const active = getContext();
        expect(active).toBe(ctx);
      });
    });

    it("nests contexts correctly", () => {
      const root = createRootContext("svc");
      runWithContext(root, () => {
        expect(getContext()).toBe(root);

        const child = createChildContext(root);
        runWithContext(child, () => {
          expect(getContext()).toBe(child);
          expect(getContext()!.depth).toBe(1);
        });

        // After child context exits, root is restored
        expect(getContext()).toBe(root);
      });
    });

    it("propagates context through async boundaries", async () => {
      const ctx = createRootContext("svc");
      await runWithContext(ctx, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(getContext()).toBe(ctx);
      });
    });
  });
});
