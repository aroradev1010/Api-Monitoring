// src/tests/useSSE.backoff.test.ts
import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import { createRoot, Root } from "react-dom/client";
import { act } from "react";

jest.useFakeTimers();

describe("useSSE backoff -> fallback", () => {
  const ORIGINAL_ES = (global as any).EventSource;
  const ORIGINAL_SET_INTERVAL = window.setInterval;

  let root: Root | null = null;

  beforeEach(() => {
    // ensure no leftover state
    (global as any).EventSource = undefined;
    (window as any).__sse_state = undefined;
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // restore
    (global as any).EventSource = ORIGINAL_ES;
    window.setInterval = ORIGINAL_SET_INTERVAL;
    jest.useRealTimers();
    try {
      // cleanup DOM - use root.unmount() when available
      if (root) {
        root.unmount();
        root = null;
      } else {
        const mount = document.getElementById("root");
        if (mount) {
          // defensive fallback (avoid TS errors by using any)
          (require("react-dom") as any).unmountComponentAtNode(mount);
        }
      }
    } catch {}
  });

  test("enters fallback after retries and schedules polling reconnect", () => {
    // A very small deterministic Mock EventSource that calls 'error' immediately.
    type ListenerMap = { [k: string]: Array<(...args: any[]) => void> };

    class MockEventSource {
      listeners: ListenerMap = {};
      url: string;
      readyState = 0;
      constructor(url: string) {
        this.url = url;
        // call 'error' asynchronously (so hook registers listener first)
        setTimeout(() => {
          this.emit("error");
        }, 0);
      }
      addEventListener(name: string, cb: (...args: any[]) => void) {
        if (!this.listeners[name]) this.listeners[name] = [];
        this.listeners[name].push(cb);
      }
      removeEventListener(name: string, cb: (...args: any[]) => void) {
        this.listeners[name] = (this.listeners[name] || []).filter(
          (c) => c !== cb
        );
      }
      close() {
        this.readyState = 2;
      }
      // helper to emit events in test if needed
      emit(name: string, ev?: any) {
        (this.listeners[name] || []).forEach((cb) => {
          try {
            cb(ev);
          } catch (e) {
            // ignore
          }
        });
      }
    }

    // Swap global EventSource with our Mock
    (global as any).EventSource = MockEventSource;

    // Spy on setInterval to assert fallback polling scheduled
    const setIntervalSpy = jest.spyOn(window, "setInterval");

    // Import/use hook inside test component to keep isolation.
    const TestComponent = () => {
      // lazy import to ensure test's mocked globals are in place
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { useSSE } =
        require("../hooks/useSSE") as typeof import("../hooks/useSSE");
      // use small timings for a fast test:
      const { fallback } = useSSE({
        url: "/v1/stream",
        maxRetries: 2, // attempt 0,1 then fallback at attempt >= 2
        baseDelayMs: 10,
        jitterMs: 0, // deterministic
        pollingReconnectIntervalMs: 1000,
        onFallback: (isFb: boolean) => {
          // expose in window for assertions
          (window as any).__sse_onFallback_called = isFb;
        },
      });

      useEffect(() => {
        // make the hook state accessible to the test code
        (window as any).__sse_state = { fallback };
      }, [fallback]);

      return null;
    };

    // mount into DOM
    const mount = document.createElement("div");
    mount.id = "root";
    document.body.appendChild(mount);

    act(() => {
      // create a client root and render the TestComponent
      root = createRoot(mount);
      root.render(React.createElement(TestComponent));
    });

    // At this point:
    // - first EventSource constructed -> it will schedule an immediate error (setTimeout 0)
    // Let microtasks run (pending timers), then advance timers for backoff schedule:
    act(() => {
      // run the immediate error timer
      jest.runOnlyPendingTimers();
    });

    // After the first error, scheduleReconnect() will schedule a reconnect with delay = baseDelayMs * 2^0 = 10ms
    // Advance timers to fire that timeout:
    act(() => {
      jest.advanceTimersByTime(20); // pass the 10ms delay and allow open() to be called again
    });

    // The second EventSource will also error immediately (Mock), which will schedule reconnect with delay 20ms (2^1 * baseDelay)
    act(() => {
      // run pending timers (the immediate error for second ES)
      jest.runOnlyPendingTimers();
    });

    act(() => {
      jest.advanceTimersByTime(30); // pass the 20ms delay and let scheduleReconnect evaluate >= maxRetries
    });

    // Now the hook should have entered fallback mode and scheduled polling via setInterval
    // Assert onFallback was called with true (exposed on window)
    expect((window as any).__sse_onFallback_called).toBe(true);

    // setInterval should have been called with pollingReconnectIntervalMs (1000)
    // At least one call to setInterval with 1000 should exist
    const found = (setIntervalSpy.mock.calls || []).some((c) => c[1] === 1000);
    expect(found).toBe(true);

    // also the hook's returned fallback should be true (exposed)
    expect((window as any).__sse_state?.fallback).toBe(true);

    // cleanup - unmount component and clear timers (done in afterEach)
  });
});
