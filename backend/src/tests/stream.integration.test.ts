// src/tests/stream.integration.test.ts
import app from "../app";
import pubsub from "../services/pubsub";
import http from "http";
import { EventSource } from "eventsource";

jest.setTimeout(20_000);

describe("SSE /v1/stream (integration)", () => {
  let server: http.Server | null = null;

  afterEach(async () => {
    if (server) {
      await new Promise<void>((res) => server!.close(() => res()));
      server = null;
    }
  });

  test("SSE client receives published event (via emitter)", async () => {
    // start server on ephemeral port
    server = app.listen(0);
    const addr = server.address();
    if (!addr || typeof addr === "string") {
      await new Promise<void>((res) => server!.close(() => res()));
      server = null;
      throw new Error("Failed to start server for SSE integration test");
    }
    const port = addr.port;
    const url = `http://127.0.0.1:${port}/v1/stream`;

    // Create EventSource client and wait for an event
    const gotEvent = new Promise<void>((resolve, reject) => {
      let es: any;
      let safety: NodeJS.Timeout | null = null;

      try {
        es = new EventSource(url);
      } catch (err) {
        reject(err);
        return;
      }

      const cleanup = () => {
        try {
          es?.close();
        } catch {}
        if (safety) {
          clearTimeout(safety);
          safety = null;
        }
      };

      // If connection opens, publish an event into the same in-process pubsub
      es.onopen = () => {
        // small delay to ensure server-side subscription is attached
        setTimeout(() => {
          try {
            (pubsub as any).emit("event", {
              service: "sse-integ-api",
              latency_ms: 7,
              started_at: new Date().toISOString(),
              kind: "http_request",
              status: "ok",
              http: { status_code: 200, method: "GET", path: "/", target_url: "https://example.com" },
            });
          } catch (e) {
            cleanup();
            reject(e);
          }
        }, 40);
      };

      es.onerror = (e: any) => {
        // don't reject on first error — wait for event or timeout
      };

      es.addEventListener("event", (ev: any) => {
        try {
          const payload = JSON.parse(ev.data);
          if (!payload) {
            cleanup();
            reject(new Error("Empty payload"));
            return;
          }
          if (payload.service !== "sse-integ-api") {
            cleanup();
            reject(
              new Error("Unexpected service in SSE payload: " + payload.service)
            );
            return;
          }
          cleanup();
          resolve();
        } catch (err) {
          cleanup();
          reject(err);
        }
      });

      // safety timeout
      safety = setTimeout(() => {
        try {
          es?.close();
        } catch {}
        reject(new Error("Timed out waiting for SSE event"));
      }, 8000);
    });

    // await the promise (will reject on failure)
    try {
      await gotEvent;
    } finally {
      if (server) {
        await new Promise<void>((res) => server!.close(() => res()));
        server = null;
      }
    }
  });
});
