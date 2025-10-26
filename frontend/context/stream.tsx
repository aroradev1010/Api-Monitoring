// src/context/stream.tsx
"use client";

import React, { createContext, useContext, useMemo, useRef, useState } from "react";
import { useSSE } from "@/hooks/useSSE";

type MetricPayload = any;
type AlertPayload = any;

export type StreamHandlers = {
    onMetric?: (m: MetricPayload) => void;
    onAlert?: (a: AlertPayload) => void;
};

export type StreamContextValue = {
    connected: boolean;
    lastPing: number | null;
    subscribe: (h: StreamHandlers) => () => void; // returns unsubscribe
};

const StreamContext = createContext<StreamContextValue | null>(null);

export function useStream() {
    const ctx = useContext(StreamContext);
    if (!ctx) throw new Error("useStream must be used within StreamProvider");
    return ctx;
}

export function StreamProvider({ children }: { children: React.ReactNode }) {
    // subscribers stored in a Set for O(1) add/remove
    const subsRef = useRef(new Set<StreamHandlers>());
    const [lastPing, setLastPing] = useState<number | null>(null);
    const [connected, setConnected] = useState(false);

    // absolute backend base (allow env override); fallback to localhost:3000
    const base = (process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3000").replace(/\/$/, "");
    const streamUrl = `${base}/v1/stream`;

    // Handlers passed to useSSE will fan-out to subscribers
    const sse = useSSE(streamUrl, {
        onMetric: (m: MetricPayload) => {
            // iterate subscribers and call onMetric
            for (const s of subsRef.current) {
                try {
                    s.onMetric && s.onMetric(m);
                } catch (err) {
                    // swallow — a single bad subscriber shouldn't kill others
                    // optionally log to console in dev
                    // console.error("subscriber onMetric threw", err);
                }
            }
        },
        onAlert: (a: AlertPayload) => {
            for (const s of subsRef.current) {
                try {
                    s.onAlert && s.onAlert(a);
                } catch (err) {
                    // console.error("subscriber onAlert threw", err);
                }
            }
        },
    });

    // map sse.connected/lastPing to provider state (so consumers can read reactive values)
    // note: useSSE exposes connected/lastPing as values updated by the hook; here we update local state
    React.useEffect(() => {
        setConnected(sse.connected);
    }, [sse.connected]);

    React.useEffect(() => {
        setLastPing(sse.lastPing ?? null);
    }, [sse.lastPing]);

    const subscribe = React.useCallback((h: StreamHandlers) => {
        subsRef.current.add(h);
        return () => {
            subsRef.current.delete(h);
        };
    }, []);

    const value = useMemo<StreamContextValue>(() => {
        return {
            connected,
            lastPing,
            subscribe,
        };
    }, [connected, lastPing, subscribe]);

    return <StreamContext.Provider value={value}>{children}</StreamContext.Provider>;
}
