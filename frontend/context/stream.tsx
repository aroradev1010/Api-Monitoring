// src/context/stream.tsx
"use client";

import React, { createContext, useContext, useMemo, useRef, useCallback } from "react";
import { useSSE } from "@/hooks/useSSE";

type MetricPayload = any;
type AlertPayload = any;

export type StreamSubscriber = {
    onMetric?: (m: MetricPayload) => void;
    onAlert?: (a: AlertPayload) => void;
};

export type StreamContextValue = {
    connected: boolean;
    fallback: boolean;
    lastPing: number | null;
    reconnect: () => void;
    close: () => void;
    /**
     * Subscribe to incoming events. Returns an unsubscribe function.
     * Example:
     *   const unsub = stream.subscribe({ onMetric: m => ... });
     *   unsub(); // stop listening
     */
    subscribe: (s: StreamSubscriber) => () => void;
};

const StreamContext = createContext<StreamContextValue | null>(null);

export function StreamProvider({
    children,
    url = "/v1/stream",
}: {
    children: React.ReactNode;
    url?: string;
}) {
    // keep a stable ref of subscribers
    const subscribersRef = useRef<Set<StreamSubscriber>>(new Set());

    // publish helpers (stable references so useSSE callbacks can call them)
    const publishMetric = useCallback((m: MetricPayload) => {
        for (const s of subscribersRef.current) {
            try {
                s.onMetric?.(m);
            } catch (err) {
                // swallow to avoid breaking other subscribers
                // optionally log
                // console.error("subscriber onMetric error", err);
            }
        }
    }, []);

    const publishAlert = useCallback((a: AlertPayload) => {
        for (const s of subscribersRef.current) {
            try {
                s.onAlert?.(a);
            } catch (err) {
                // console.error("subscriber onAlert error", err);
            }
        }
    }, []);

    // wire useSSE to publish into our subscribers set
    const { connected, fallback, lastPing, reconnect, close } = useSSE({
        url,
        onMetric: publishMetric,
        onAlert: publishAlert,
        onFallback: (isFallback) => {
            // optional: expose to analytics / logs
            if (isFallback) {
                // console.warn("SSE fallback active");
            } else {
                // console.info("SSE recovered");
            }
        },
    });

    // subscribe API: add subscriber, return unsubscribe function
    const subscribe = useCallback((s: StreamSubscriber) => {
        subscribersRef.current.add(s);
        let unsubbed = false;
        return () => {
            if (unsubbed) return;
            subscribersRef.current.delete(s);
            unsubbed = true;
        };
    }, []);

    const value = useMemo<StreamContextValue>(
        () => ({
            connected,
            fallback,
            lastPing,
            reconnect,
            close,
            subscribe,
        }),
        [connected, fallback, lastPing, reconnect, close, subscribe]
    );

    return <StreamContext.Provider value={value}>{children}</StreamContext.Provider>;
}

export function useStream(): StreamContextValue {
    const ctx = useContext(StreamContext);
    if (!ctx) {
        throw new Error("useStream must be used inside StreamProvider");
    }
    return ctx;
}
