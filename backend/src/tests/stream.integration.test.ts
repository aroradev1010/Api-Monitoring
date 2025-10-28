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

  test("SSE client receives published metric events (via emitter)", async () => {
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

    // Create EventSource client and wait for a metric event
    const gotMetric = new Promise<void>((resolve, reject) => {
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

      // If connection opens, publish a metric into the same in-process pubsub
      es.onopen = () => {
        // small delay to ensure server-side subscription is attached
        setTimeout(() => {
          try {
            (pubsub as any).emit("metric", {
              api_id: "sse-integ-api",
              latency_ms: 7,
              timestamp: new Date().toISOString(),
              status_code: 200,
            });
          } catch (e) {
            cleanup();
            reject(e);
          }
        }, 40);
      };

      es.onerror = (e: any) => {
        // don't reject on first error — wait for metric or timeout
      };

      es.addEventListener("metric", (ev: any) => {
        try {
          const payload = JSON.parse(ev.data);
          if (!payload) {
            cleanup();
            reject(new Error("Empty payload"));
            return;
          }
          if (payload.api_id !== "sse-integ-api") {
            cleanup();
            reject(
              new Error("Unexpected api_id in SSE payload: " + payload.api_id)
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
        reject(new Error("Timed out waiting for SSE metric event"));
      }, 8000);
    });

    // await the promise (will reject on failure)
    try {
      await gotMetric;
    } finally {
      if (server) {
        await new Promise<void>((res) => server!.close(() => res()));
        server = null;
      }
    }
  });
});
