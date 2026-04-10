"use client";

import { useState } from "react";
import { Explanation } from "@/types";
import CausalChain from "@/components/CausalChain";
import { relativeTime } from "@/lib/time";
import Link from "next/link";

interface Props {
  explanation: Explanation;
}

function ConfidenceBadge({ confidence, reason }: { confidence: "high" | "low"; reason: string }) {
  const isHigh = confidence === "high";
  return (
    <span
      title={reason}
      className={[
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide",
        isHigh
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
      ].join(" ")}
    >
      {isHigh ? "● High confidence" : "◐ Low confidence"}
    </span>
  );
}

function MetaItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm font-mono text-foreground break-all">{value}</dd>
    </div>
  );
}

export default function ExplanationView({ explanation }: Props) {
  const [rawOpen, setRawOpen] = useState(false);

  return (
    <div className="space-y-8">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Back to Incidents
      </Link>

      {/* A — Summary */}
      <section aria-labelledby="summary-heading">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
          <h1
            id="summary-heading"
            className="text-xl font-bold text-foreground leading-snug max-w-2xl"
          >
            {explanation.summary}
          </h1>
          <ConfidenceBadge
            confidence={explanation.confidence}
            reason={explanation.confidence_reason}
          />
        </div>
        {explanation.detail && explanation.detail !== explanation.summary && (
          <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
            {explanation.detail}
          </p>
        )}
      </section>

      {/* B — Causal Chain */}
      <section aria-labelledby="chain-heading">
        <h2
          id="chain-heading"
          className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4"
        >
          Causal Chain
        </h2>
        <CausalChain chain={explanation.causal_chain} />
      </section>

      {/* Divider */}
      <hr className="border-border" />

      {/* C — Metadata */}
      <section aria-labelledby="meta-heading">
        <h2
          id="meta-heading"
          className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4"
        >
          Incident Metadata
        </h2>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-5">
          <MetaItem
            label="Correlation ID"
            value={explanation.correlation_id ?? <span className="text-muted-foreground italic">none</span>}
          />
          <MetaItem
            label="Failure started"
            value={relativeTime(explanation.failure_started_at)}
          />
          <MetaItem
            label="Duration"
            value={
              explanation.total_duration_ms != null
                ? `${explanation.total_duration_ms.toLocaleString()} ms`
                : "—"
            }
          />
          <MetaItem label="Events" value={explanation.event_count} />
        </dl>
      </section>

      {/* D — Raw events (collapsible) */}
      <section>
        <button
          id="raw-events-toggle"
          onClick={() => setRawOpen((o) => !o)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
          aria-expanded={rawOpen}
        >
          <span
            className={`inline-block transition-transform duration-150 ${rawOpen ? "rotate-90" : ""}`}
          >
            ▶
          </span>
          {rawOpen ? "Hide" : "Show"} raw chain data
        </button>

        {rawOpen && (
          <pre className="mt-3 p-4 rounded-lg bg-muted/40 border border-border text-[11px] font-mono text-foreground/80 overflow-auto max-h-96 leading-relaxed">
            {JSON.stringify(explanation.causal_chain, null, 2)}
          </pre>
        )}
      </section>
    </div>
  );
}
