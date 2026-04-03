// src/context/stream.tsx
"use client";

import React, { createContext, useContext, useMemo, useRef, useCallback } from "react";
import { useSSE } from "@/hooks/useSSE";

type EventPayload = any;
type AlertPayload = any;
type ExplanationPayload = any;

export type StreamSubscriber = {
    onEvent?: (e: EventPayload) => void;
    onAlert?: (a: AlertPayload) => void;
    onExplanation?: (x: ExplanationPayload) => void;
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
     *   const unsub = stream.subscribe({ onEvent: e => ... });
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
    const publishEvent = useCallback((e: EventPayload) => {
        for (const s of subscribersRef.current) {
            try {
                s.onEvent?.(e);
            } catch (err) {
                // swallow to avoid breaking other subscribers
            }
        }
    }, []);

    const publishAlert = useCallback((a: AlertPayload) => {
        for (const s of subscribersRef.current) {
            try {
                s.onAlert?.(a);
            } catch (err) {
                // swallow
            }
        }
    }, []);

    const publishExplanation = useCallback((x: ExplanationPayload) => {
        for (const s of subscribersRef.current) {
            try {
                s.onExplanation?.(x);
            } catch (err) {
                // swallow
            }
        }
    }, []);

    // wire useSSE to publish into our subscribers set
    const { connected, fallback, lastPing, reconnect, close } = useSSE({
        url,
        onEvent: publishEvent,
        onAlert: publishAlert,
        onExplanation: publishExplanation,
        onFallback: (isFallback) => {
            // optional: expose to analytics / logs
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
