"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type UseSSEOptions = {
  onMetric?: (m: any) => void;
  onAlert?: (a: any) => void;
  onPing?: (p: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onFallback?: (isFallback: boolean) => void;
  url?: string;
  // reconnect/backoff tuning
  maxRetries?: number; // attempts before entering fallback
  baseDelayMs?: number; // base for exponential backoff
  maxDelayMs?: number; // cap
  jitterMs?: number; // added/subtracted random jitter
  pollingReconnectIntervalMs?: number; // while in fallback, try reconnect at this interval
};

export function useSSE(opts: UseSSEOptions = {}) {
  const {
    url = "/v1/stream",
    onMetric,
    onAlert,
    onPing,
    onOpen,
    onClose,
    onFallback,
    maxRetries = 6,
    baseDelayMs = 500, // 0.5s
    maxDelayMs = 30000, // 30s
    jitterMs = 200,
    pollingReconnectIntervalMs = 30000, // try reconnect every 30s in fallback
  } = opts;

  const [connected, setConnected] = useState(false);
  const [fallback, setFallback] = useState(false);
  const lastPing = useRef<number | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const retryRef = useRef<number>(0);
  const reconnectTimer = useRef<number | null>(null);
  const pollingReconnectTimer = useRef<number | null>(null);
  const closedByUserRef = useRef(false);

  // helper: compute backoff with jitter
  const computeDelay = useCallback(
    (attempt: number) => {
      const expo = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      // jitter +/- jitterMs
      const jitter = Math.floor(Math.random() * (jitterMs * 2 + 1)) - jitterMs;
      return Math.max(0, expo + jitter);
    },
    [baseDelayMs, maxDelayMs, jitterMs]
  );

  // open connection
  const open = useCallback(() => {
    // clear any fallback polling attempts
    if (pollingReconnectTimer.current) {
      window.clearInterval(pollingReconnectTimer.current);
      pollingReconnectTimer.current = null;
    }

    // don't open if user closed intentionally
    if (closedByUserRef.current) return;

    try {
      const es = new EventSource(url);
      esRef.current = es;

      es.addEventListener("open", () => {
        retryRef.current = 0;
        setFallback(false);
        setConnected(true);
        onOpen && onOpen();
        onFallback && onFallback(false);
      });

      es.addEventListener("error", (ev: any) => {
        // mark disconnected and attempt reconnect/backoff
        setConnected(false);
        scheduleReconnect();
      });

      es.addEventListener("ping", (ev: MessageEvent) => {
        try {
          const payload = JSON.parse(ev.data);
          lastPing.current = payload?.t ?? Date.now();
          onPing && onPing(payload);
        } catch {
          lastPing.current = Date.now();
          onPing && onPing({ t: Date.now() });
        }
      });

      es.addEventListener("metric", (ev: MessageEvent) => {
        try {
          const payload = JSON.parse(ev.data);
          onMetric && onMetric(payload);
        } catch {
          // ignore parse errors
        }
      });

      es.addEventListener("alert", (ev: MessageEvent) => {
        try {
          const payload = JSON.parse(ev.data);
          onAlert && onAlert(payload);
        } catch {
          // ignore parse errors
        }
      });

      // also handle default message
      es.onmessage = (ev: MessageEvent) => {
        // no-op here — specialized listeners above handle events
      };
    } catch (err) {
      // opening failed synchronously (e.g., EventSource not supported)
      setConnected(false);
      scheduleReconnect();
    }
  }, [url, onMetric, onAlert, onPing, onOpen, onFallback]);

  // schedule reconnect with backoff
  const scheduleReconnect = useCallback(() => {
    if (closedByUserRef.current) return;
    const attempt = retryRef.current ?? 0;

    // if we've exceeded allowed attempts => enter fallback mode
    if (attempt >= maxRetries) {
      // enable fallback polling mode
      setFallback(true);
      onFallback && onFallback(true);

      // try periodic reconnect attempts while in fallback (every pollingReconnectIntervalMs)
      if (!pollingReconnectTimer.current) {
        pollingReconnectTimer.current = window.setInterval(() => {
          // reset counters and attempt to reconnect once
          retryRef.current = 0;
          open();
        }, pollingReconnectIntervalMs);
      }

      return;
    }

    const delay = computeDelay(attempt);
    retryRef.current = attempt + 1;

    // clear old timer if any
    if (reconnectTimer.current) {
      window.clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }

    reconnectTimer.current = window.setTimeout(() => {
      // ensure previous connection closed
      try {
        esRef.current?.close();
      } catch {}
      esRef.current = null;
      open();
    }, delay) as unknown as number; // window.setTimeout returns number in browser
  }, [computeDelay, maxRetries, open, onFallback, pollingReconnectIntervalMs]);

  // close everything
  const close = useCallback(() => {
    closedByUserRef.current = true;
    setFallback(false);
    onFallback && onFallback(false);
    setConnected(false);
    try {
      if (reconnectTimer.current) {
        window.clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      if (pollingReconnectTimer.current) {
        window.clearInterval(pollingReconnectTimer.current);
        pollingReconnectTimer.current = null;
      }
      esRef.current?.close();
      esRef.current = null;
      onClose && onClose();
    } catch {}
  }, [onClose, onFallback]);

  // start once on mount
  useEffect(() => {
    closedByUserRef.current = false;
    retryRef.current = 0;
    open();

    return () => {
      // cleanup timers and es
      try {
        closedByUserRef.current = true;
        if (reconnectTimer.current) {
          window.clearTimeout(reconnectTimer.current);
          reconnectTimer.current = null;
        }
        if (pollingReconnectTimer.current) {
          window.clearInterval(pollingReconnectTimer.current);
          pollingReconnectTimer.current = null;
        }
        esRef.current?.close();
        esRef.current = null;
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  return {
    connected,
    fallback,
    lastPing: lastPing.current,
    close,
    // explicit reconnect (reset counters and attempt)
    reconnect: () => {
      retryRef.current = 0;
      setFallback(false);
      onFallback && onFallback(false);
      open();
    },
  };
}
