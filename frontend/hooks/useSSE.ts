// src/hooks/useSSE.ts
"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type Handlers = {
  onMetric?: (m: any) => void;
  onAlert?: (a: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
};

export function useSSE(
  url = "/v1/stream",
  handlers: Handlers = {},
  opts?: { pollInterval?: number; maxRetries?: number }
) {
  const { onMetric, onAlert, onOpen, onClose } = handlers;
  const pollInterval = opts?.pollInterval ?? 5000;
  const maxRetries = opts?.maxRetries ?? 6;

  const [connected, setConnected] = useState(false);
  const [lastPing, setLastPing] = useState<number | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef(0);
  const pollRef = useRef<number | null>(null);
  const stoppedRef = useRef(false);

  const supported = typeof window !== "undefined" && "EventSource" in window;

  const startPolling = useCallback(
    (pollUrl: string) => {
      // simple fallback polling: GET /v1/stream/poll or metrics/alerts endpoints
      // default pollUrl could be a combined endpoint but here we call /v1/stream?poll=1 -> backend can support
      if (pollRef.current) return;
      const id = window.setInterval(async () => {
        try {
          const res = await fetch(pollUrl, { cache: "no-store" });
          if (!res.ok) return;
          const data = await res.json();
          // expected shape: { metrics?: [], alerts?: [], ping?: { t } }
          if (data?.metrics && onMetric) {
            for (const m of data.metrics) onMetric(m);
          }
          if (data?.alerts && onAlert) {
            for (const a of data.alerts) onAlert(a);
          }
          if (data?.ping) {
            setLastPing(Date.now());
          }
        } catch {
          // ignore poll errors
        }
      }, pollInterval);
      pollRef.current = id;
    },
    [onMetric, onAlert, pollInterval]
  );

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    stoppedRef.current = false;
    if (!supported) {
      // fallback to polling using explicit poll endpoint if you have it,
      // otherwise you can poll the metrics/alerts endpoints separately.
      startPolling(`${url}?poll=1`);
      setConnected(false);
      return () => {
        stoppedRef.current = true;
        stopPolling();
      };
    }

    function connect() {
      if (stoppedRef.current) return;
      const es = new EventSource(url, { withCredentials: false } as any);
      esRef.current = es;

      es.onopen = () => {
        retryRef.current = 0;
        setConnected(true);
        onOpen?.();
        stopPolling(); // stop fallback if running
      };

      es.onerror = (e) => {
        setConnected(false);
        // close and schedule reconnect
        try {
          es.close();
        } catch {}
        // notify
        onClose?.();

        // backoff calculation
        const attempt = ++retryRef.current;
        if (attempt > maxRetries) {
          // give up and enable polling fallback
          startPolling(`${url}?poll=1`);
          return;
        }
        const backoff = Math.min(1000 * 2 ** (attempt - 1), 30_000); // cap 30s
        const jitter = Math.floor(Math.random() * 300);
        const wait = backoff + jitter;
        setTimeout(() => {
          if (!stoppedRef.current) connect();
        }, wait);
      };

      es.addEventListener("ping", (ev: MessageEvent) => {
        try {
          const p = JSON.parse(ev.data);
          setLastPing(p?.t ? new Date(p.t).getTime() : Date.now());
        } catch {
          setLastPing(Date.now());
        }
      });

      es.addEventListener("metric", (ev: MessageEvent) => {
        try {
          const payload = JSON.parse(ev.data);
          onMetric && onMetric(payload);
        } catch {
          // ignore
        }
      });

      es.addEventListener("alert", (ev: MessageEvent) => {
        try {
          const payload = JSON.parse(ev.data);
          onAlert && onAlert(payload);
        } catch {
          // ignore
        }
      });
    }

    connect();

    return () => {
      stoppedRef.current = true;
      stopPolling();
      try {
        esRef.current?.close();
      } catch {}
      esRef.current = null;
    };
  }, [
    url,
    supported,
    onMetric,
    onAlert,
    onOpen,
    onClose,
    startPolling,
    stopPolling,
    maxRetries,
  ]);

  // manual close/reconnect helpers
  const close = () => {
    stoppedRef.current = true;
    try {
      esRef.current?.close();
    } catch {}
    esRef.current = null;
    stopPolling();
    setConnected(false);
  };

  const reconnect = () => {
    close();
    stoppedRef.current = false;
    retryRef.current = 0;
    // will auto-reconnect via effect (re-run) if deps change, so call connect by toggling a ref
    // simple approach: re-run effect by toggling a tiny state is overkill; instead create a new EventSource now:
    // just call use effect's connect by creating one here — but to keep simple: reload page or create new EventSource
    // For typical usage, prefer close() then create a fresh EventSource by toggling a key in parent.
    // We'll just create a fresh ES here:
    if (typeof window !== "undefined" && "EventSource" in window) {
      const es = new EventSource(url);
      esRef.current = es;
    } else {
      startPolling(`${url}?poll=1`);
    }
  };

  return {
    supported,
    connected,
    lastPing,
    close,
    reconnect,
    forcePolling: () => startPolling(`${url}?poll=1`),
  };
}
