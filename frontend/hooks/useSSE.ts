// src/hooks/useSSE.ts
"use client";
import { useEffect, useRef, useState } from "react";

export function useSSE(
  url = "/v1/stream",
  opts?: { onMetric?: (m: any) => void; onAlert?: (a: any) => void }
) {
  const { onMetric, onAlert } = opts || {};
  const [connected, setConnected] = useState(false);
  const lastPing = useRef<number | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const supported = typeof window !== "undefined" && "EventSource" in window;

  useEffect(() => {
    if (!supported) return;

    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener("open", () => {
      setConnected(true);
    });
    es.addEventListener("error", () => {
      setConnected(false);
    });

    es.addEventListener("ping", (ev: MessageEvent) => {
      try {
        const p = JSON.parse(ev.data);
        lastPing.current = p?.t ?? Date.now();
      } catch {
        lastPing.current = Date.now();
      }
    });

    es.addEventListener("metric", (ev: MessageEvent) => {
      try {
        const payload = JSON.parse(ev.data);
        onMetric && onMetric(payload);
      } catch (err) {
        // ignore
      }
    });

    es.addEventListener("alert", (ev: MessageEvent) => {
      try {
        const payload = JSON.parse(ev.data);
        onAlert && onAlert(payload);
      } catch (err) {
        // ignore
      }
    });

    // When the window/tab is hidden, EventSource may still run — fine. Clean up on unmount.
    return () => {
      try {
        es.close();
      } catch {}
      esRef.current = null;
    };
  }, [url, supported, onMetric, onAlert]);

  // fallback info: if EventSource unsupported, connected = false and you should poll
  return {
    supported,
    connected,
    lastPing: lastPing.current,
    close: () => {
      try {
        esRef.current?.close();
      } catch {}
    },
  };
}
