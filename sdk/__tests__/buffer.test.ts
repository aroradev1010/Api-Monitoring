// sdk/__tests__/buffer.test.ts
import { EventBuffer } from "../src/buffer";
import type { EventPayload, ResolvedConfig } from "../src/types";
import axios from "axios";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

function makeConfig(overrides: Partial<ResolvedConfig> = {}): ResolvedConfig {
  return {
    apiKey: "test-key",
    service: "test-svc",
    ingestUrl: "http://localhost:4000",
    flushIntervalMs: 60_000, // high so timer doesn't fire in tests
    debug: false,
    disabled: false,
    ...overrides,
  };
}

function makeEvent(id: string): EventPayload {
  return {
    event_id: id,
    service: "test-svc",
    kind: "custom",
    operation: "test",
    correlation_id: "cid-1",
    parent_event_id: null,
    status: "ok",
    latency_ms: 10,
    error_code: null,
    error_message: null,
    started_at: new Date().toISOString(),
    ended_at: new Date().toISOString(),
    tags: { env: "test", service: "test-svc" },
    sdk_version: "0.1.0",
    api_key: "test-key",
  };
}

describe("EventBuffer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.post.mockResolvedValue({ status: 202 });
  });

  it("does not flush until batch size is reached", () => {
    const buf = new EventBuffer(makeConfig());
    buf.add(makeEvent("e1"));
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it("flushes when batch reaches 50 events", () => {
    const buf = new EventBuffer(makeConfig());
    for (let i = 0; i < 50; i++) {
      buf.add(makeEvent(`e-${i}`));
    }
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    const call = mockedAxios.post.mock.calls[0];
    expect(call[0]).toBe("http://localhost:4000/v1/events/batch");
    expect((call[1] as any).events).toHaveLength(50);
  });

  it("manual flush sends whatever is in buffer", () => {
    const buf = new EventBuffer(makeConfig());
    buf.add(makeEvent("e1"));
    buf.add(makeEvent("e2"));
    buf.flush();
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect((mockedAxios.post.mock.calls[0][1] as any).events).toHaveLength(2);
  });

  it("does not send if buffer is empty on flush", () => {
    const buf = new EventBuffer(makeConfig());
    buf.flush();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it("does not add events when disabled", () => {
    const buf = new EventBuffer(makeConfig({ disabled: true }));
    for (let i = 0; i < 100; i++) {
      buf.add(makeEvent(`e-${i}`));
    }
    buf.flush();
    expect(mockedAxios.post).not.toHaveBeenCalled();
  });

  it("retries on failure with exponential backoff", async () => {
    jest.useFakeTimers();
    mockedAxios.post
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce({ status: 202 });

    const buf = new EventBuffer(makeConfig({ debug: true }));
    buf.add(makeEvent("e1"));
    buf.flush();

    // Wait for the first (failed) call to settle
    await jest.advanceTimersByTimeAsync(0);
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);

    // Advance past retry delay (500ms * 2^0 = 500ms)
    await jest.advanceTimersByTimeAsync(600);

    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  it("drain flushes remaining buffer", async () => {
    const buf = new EventBuffer(makeConfig());
    buf.add(makeEvent("e1"));
    buf.add(makeEvent("e2"));

    await buf.drain();

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect((mockedAxios.post.mock.calls[0][1] as any).events).toHaveLength(2);
  });
});
