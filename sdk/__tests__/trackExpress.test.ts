// sdk/__tests__/trackExpress.test.ts
import { init, _resetForTesting } from "../src/init";
import { trackExpress } from "../src/trackExpress";
import { getContext } from "../src/context";
import type { EventPayload } from "../src/types";
import type { Request, Response, NextFunction } from "express";

const mockAdd = jest.fn();

jest.mock("../src/buffer", () => ({
  EventBuffer: jest.fn().mockImplementation(() => ({
    add: mockAdd,
    flush: jest.fn(),
    drain: jest.fn().mockResolvedValue(undefined),
  })),
}));

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    method: "GET",
    path: "/api/users",
    originalUrl: "/api/users",
    route: { path: "/api/users" },
    protocol: "http",
    get: jest.fn().mockReturnValue("localhost:3000"),
    headers: {},
    ...overrides,
  } as unknown as Request;
}

function mockRes(): Response & { _triggerFinish: () => void } {
  const listeners: Record<string, Function[]> = {};
  return {
    statusCode: 200,
    once: jest.fn((event: string, cb: Function) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(cb);
    }),
    _triggerFinish: () => {
      (listeners["finish"] || []).forEach((cb) => cb());
    },
  } as unknown as Response & { _triggerFinish: () => void };
}

describe("trackExpress()", () => {
  beforeEach(() => {
    mockAdd.mockClear();
    _resetForTesting();
    init({ apiKey: "test-key", service: "test-svc" });
  });

  afterEach(() => {
    _resetForTesting();
  });

  it("sets up ALS context and calls next()", () => {
    const middleware = trackExpress();
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("provides correlation context inside the handler", () => {
    const middleware = trackExpress();
    const req = mockReq();
    const res = mockRes();

    let capturedCtx: ReturnType<typeof getContext> = null;

    middleware(req, res, () => {
      capturedCtx = getContext();
    });

    expect(capturedCtx).not.toBeNull();
    expect(capturedCtx!.depth).toBe(0);
    expect(capturedCtx!.service).toBe("test-svc");
  });

  it("reuses X-Correlation-ID from headers", () => {
    const middleware = trackExpress();
    const req = mockReq({
      headers: { "x-correlation-id": "upstream-cid" },
    } as any);
    const res = mockRes();

    let capturedCid: string | undefined;
    middleware(req, res, () => {
      capturedCid = getContext()?.correlationId;
    });

    expect(capturedCid).toBe("upstream-cid");
  });

  it("emits an http_request event on response finish", () => {
    const middleware = trackExpress();
    const req = mockReq();
    const res = mockRes();

    middleware(req, res, () => {});
    res._triggerFinish();

    const events = mockAdd.mock.calls.map((c: any[]) => c[0] as EventPayload);
    const httpEvent = events.find((e) => e.kind === "http_request");

    expect(httpEvent).toBeDefined();
    expect(httpEvent!.parent_event_id).toBeNull();
    expect(httpEvent!.http!.method).toBe("GET");
    expect(httpEvent!.http!.path).toBe("/api/users");
    expect(httpEvent!.http!.target_url).toBe("http://localhost:3000/api/users");
  });

  it("uses X-Parent-Event-ID as parent_event_id for incoming HTTP", () => {
    const middleware = trackExpress();
    const req = mockReq({
      headers: {
        "x-correlation-id": "upstream-cid",
        "x-parent-event-id": "upstream-event-123",
      },
    } as any);
    const res = mockRes();

    middleware(req, res, () => {});
    res._triggerFinish();

    const events = mockAdd.mock.calls.map((c: any[]) => c[0] as EventPayload);
    const httpEvent = events.find((e) => e.kind === "http_request");

    expect(httpEvent).toBeDefined();
    expect(httpEvent!.correlation_id).toBe("upstream-cid");
    expect(httpEvent!.parent_event_id).toBe("upstream-event-123");
  });

  it("sets status to error for 4xx/5xx responses", () => {
    const middleware = trackExpress();
    const req = mockReq();
    const res = mockRes();
    res.statusCode = 500;

    middleware(req, res, () => {});
    res._triggerFinish();

    const events = mockAdd.mock.calls.map((c: any[]) => c[0] as EventPayload);
    const httpEvent = events.find((e) => e.kind === "http_request");

    expect(httpEvent).toBeDefined();
    expect(httpEvent!.status).toBe("error");
    expect(httpEvent!.error_code).toBe("500");
  });

  it("passes through silently if SDK is not initialized", () => {
    _resetForTesting(); // un-init SDK

    const middleware = trackExpress();
    const req = mockReq();
    const res = mockRes();
    const next = jest.fn();

    middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
