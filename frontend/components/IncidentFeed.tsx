"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Explanation } from "@/types";
import { getExplanations } from "@/services/api";
import { useStream } from "@/context/stream";
import IncidentCard from "@/components/IncidentCard";
import ServiceFilter from "@/components/ServiceFilter";

// ─── Skeleton ─────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-xl px-5 py-4 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2">
          <div className="h-5 w-16 rounded-md bg-muted" />
          <div className="h-5 w-24 rounded-md bg-muted" />
        </div>
        <div className="h-5 w-14 rounded-full bg-muted" />
      </div>
      <div className="h-4 w-3/4 rounded bg-muted mb-2" />
      <div className="h-4 w-1/2 rounded bg-muted" />
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
      <span className="text-4xl select-none">✓</span>
      <p className="text-base font-medium text-foreground">No incidents detected.</p>
      <p className="text-sm text-muted-foreground">Your system is running normally.</p>
    </div>
  );
}

// ─── Error state ───────────────────────────────────────────────────

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <span className="text-4xl select-none">⚠</span>
      <p className="text-base font-medium text-foreground">Failed to load incidents</p>
      <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
      <button
        id="incident-feed-retry"
        onClick={onRetry}
        className="mt-2 text-sm px-4 py-2 rounded-lg border border-border hover:bg-muted/50 transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

// ─── IncidentFeed ──────────────────────────────────────────────────

export default function IncidentFeed() {
  const [explanations, setExplanations] = useState<Explanation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serviceFilter, setServiceFilter] = useState<string | undefined>(undefined);

  // Deduplication: track explanation_ids we've received via SSE or initial fetch
  const seenIds = useRef<Set<string>>(new Set());

  const stream = useStream();

  // ── Initial fetch ────────────────────────────────────────────────
  const fetchExplanations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch without service filter — we filter client-side
      const data = await getExplanations(undefined, 50);
      const sorted = (data ?? []).sort(
        (a, b) =>
          new Date(b.failure_started_at).getTime() -
          new Date(a.failure_started_at).getTime()
      );

      // Seed the dedup set
      seenIds.current = new Set(sorted.map((e) => e.explanation_id));
      setExplanations(sorted);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load explanations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExplanations();
  }, [fetchExplanations]);

  // ── SSE subscription — prepend deduplicated new explanations ─────
  useEffect(() => {
    const unsubscribe = stream.subscribe({
      onExplanation: (incoming: any) => {
        const id: string = incoming?.explanation_id;
        if (!id || seenIds.current.has(id)) return; // deduplicate
        seenIds.current.add(id);
        setExplanations((prev) => [incoming as Explanation, ...prev]);
      },
    });
    return () => {
      try {
        unsubscribe?.();
      } catch {}
    };
  }, [stream]);

  // ── Client-side filtering ────────────────────────────────────────
  const filtered = serviceFilter
    ? explanations.filter(
        (e) =>
          e.root_cause?.service === serviceFilter ||
          e.affected_services.includes(serviceFilter)
      )
    : explanations;

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Incidents</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Live explanations — newest first
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ServiceFilter value={serviceFilter} onChange={setServiceFilter} />
          {!loading && (
            <button
              id="incident-feed-refresh"
              onClick={fetchExplanations}
              className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
            >
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* SSE status banner */}
      {stream.fallback && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-sm text-yellow-700 dark:text-yellow-400">
          <span>Live updates degraded — using polling fallback.</span>
          <button
            id="sse-reconnect"
            onClick={stream.reconnect}
            className="underline ml-3 text-xs hover:opacity-80"
          >
            Retry SSE
          </button>
        </div>
      )}

      {/* Body */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchExplanations} />
      ) : filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {filtered.map((explanation) => (
            <IncidentCard
              key={explanation.explanation_id}
              explanation={explanation}
            />
          ))}
        </div>
      )}
    </div>
  );
}
