// src/tests/explanationGenerator.test.ts
import {
  classifyKind,
  determineConfidence,
  renderSummary,
  renderDetail,
  extractRootCause,
} from "../services/explanationGenerator";
import { ICausalChainNode } from "../models/explanation.model";

function makeNode(overrides: Partial<ICausalChainNode> = {}): ICausalChainNode {
  return {
    event_id: "evt-" + Math.random().toString(36).slice(2, 8),
    service: "svc-a",
    operation: "https://example.com",
    status: "ok",
    latency_ms: 100,
    started_at: new Date("2025-01-01T10:00:00Z"),
    error_code: null,
    error_message: null,
    role: "context",
    parent_event_id: null,
    linked_to: null,
    ...overrides,
  };
}

describe("Explanation Generator", () => {
  describe("classifyKind", () => {
    test("single_failure: 1 failure, 1 service", () => {
      const chain = [
        makeNode({ role: "root_cause", status: "error", service: "svc-a" }),
      ];
      expect(classifyKind(chain, true)).toBe("single_failure");
    });

    test("upstream_caused: root_cause service differs from other failures", () => {
      const chain = [
        makeNode({ role: "context", status: "ok", service: "svc-b" }),
        makeNode({ role: "root_cause", status: "error", service: "svc-a" }),
        makeNode({ role: "propagation", status: "error", service: "svc-b" }),
      ];
      expect(classifyKind(chain, true)).toBe("upstream_caused");
    });

    test("cascade: failures across ≥3 services", () => {
      const chain = [
        makeNode({ role: "root_cause", status: "error", service: "svc-a" }),
        makeNode({ role: "propagation", status: "error", service: "svc-b" }),
        makeNode({ role: "propagation", status: "error", service: "svc-c" }),
      ];
      expect(classifyKind(chain, true)).toBe("cascade");
    });

    test("timeout_chain: all failures are timeouts", () => {
      const chain = [
        makeNode({ role: "root_cause", status: "timeout", service: "svc-a" }),
        makeNode({ role: "propagation", status: "timeout", service: "svc-b" }),
      ];
      expect(classifyKind(chain, true)).toBe("timeout_chain");
    });

    test("unresolved: no failures", () => {
      const chain = [
        makeNode({ role: "context", status: "ok" }),
      ];
      expect(classifyKind(chain, true)).toBe("unresolved");
    });
  });

  describe("determineConfidence", () => {
    test("high when correlation_id present", () => {
      const { confidence } = determineConfidence(true);
      expect(confidence).toBe("high");
    });

    test("low when fallback", () => {
      const { confidence, confidence_reason } = determineConfidence(false);
      expect(confidence).toBe("low");
      expect(confidence_reason).toContain("fallback");
    });
  });

  describe("renderSummary", () => {
    test("summary is ≤160 chars", () => {
      const root = {
        service: "svc-a",
        operation: "https://example.com/very/long/path/that/goes/on/and/on",
        status: "error",
        error_code: "TIMEOUT",
        error_message: "This is a really long error message that could exceed limits if not truncated properly",
        latency_ms: 5000,
        started_at: new Date(),
      };
      const chain = [
        makeNode({ role: "root_cause", status: "error" }),
        makeNode({ role: "propagation", status: "error" }),
        makeNode({ role: "propagation", status: "error" }),
        makeNode({ role: "propagation", status: "error" }),
      ];
      const summary = renderSummary("cascade", root, chain);
      expect(summary.length).toBeLessThanOrEqual(160);
    });

    test("single_failure summary mentions service", () => {
      const root = {
        service: "auth-svc",
        operation: "/login",
        status: "error",
        error_code: null,
        error_message: null,
        latency_ms: 100,
        started_at: new Date(),
      };
      const chain = [makeNode({ role: "root_cause", status: "error" })];
      const summary = renderSummary("single_failure", root, chain);
      expect(summary).toContain("auth-svc");
    });
  });

  describe("renderDetail", () => {
    test("includes root cause and impact sections", () => {
      const root = {
        service: "svc-a",
        operation: "/api",
        status: "error",
        error_code: "HTTP_ERROR",
        error_message: "500 Internal Server Error",
        latency_ms: 300,
        started_at: new Date(),
      };
      const chain = [
        makeNode({ role: "root_cause", status: "error", service: "svc-a" }),
        makeNode({ role: "propagation", status: "error", service: "svc-b" }),
      ];
      const detail = renderDetail("upstream_caused", root, chain, ["svc-a", "svc-b"]);
      expect(detail).toContain("Root Cause");
      expect(detail).toContain("svc-a");
      expect(detail).toContain("Impact");
      expect(detail).toContain("Propagation");
    });
  });

  describe("extractRootCause", () => {
    test("extracts root_cause node", () => {
      const chain = [
        makeNode({ role: "context" }),
        makeNode({ role: "root_cause", service: "svc-x", status: "error", error_code: "TIMEOUT" }),
      ];
      const rc = extractRootCause(chain);
      expect(rc).not.toBeNull();
      expect(rc!.service).toBe("svc-x");
      expect(rc!.error_code).toBe("TIMEOUT");
    });

    test("returns null when no root_cause", () => {
      const chain = [makeNode({ role: "context" })];
      expect(extractRootCause(chain)).toBeNull();
    });
  });
});
