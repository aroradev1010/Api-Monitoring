"use client";

import { useRouter } from "next/navigation";
import { Explanation } from "@/types";
import { relativeTime } from "@/lib/time";

interface Props {
  explanation: Explanation;
}

function ConfidenceBadge({ confidence }: { confidence: "high" | "low" }) {
  const isHigh = confidence === "high";
  return (
    <span
      title={
        isHigh
          ? undefined
          : "Low confidence: No correlation_id found. Based on time + dependencies."
      }
      className={[
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide cursor-default",
        isHigh
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
      ].join(" ")}
    >
      {isHigh ? "● High" : "◐ Low"}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isError = status === "error";
  return (
    <span
      className={[
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wide",
        isError
          ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
          : "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
      ].join(" ")}
    >
      {isError ? "✕ Error" : "⏱ Timeout"}
    </span>
  );
}

export default function IncidentCard({ explanation }: Props) {
  const router = useRouter();

  const rootStatus =
    explanation.root_cause?.status ?? explanation.causal_chain[0]?.status ?? "error";

  return (
    <div
      role="button"
      tabIndex={0}
      id={`incident-card-${explanation.explanation_id}`}
      onClick={() => router.push(`/explanations/${explanation.explanation_id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ")
          router.push(`/explanations/${explanation.explanation_id}`);
      }}
      className="group relative bg-card border border-border rounded-xl px-5 py-4 cursor-pointer transition-all
        hover:border-primary/40 hover:shadow-md hover:shadow-primary/5 focus-visible:outline focus-visible:outline-2
        focus-visible:outline-primary active:scale-[0.995]"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge status={rootStatus} />
          {explanation.root_cause && (
            <span className="text-sm font-semibold text-foreground truncate max-w-[240px]">
              {explanation.root_cause.service}
            </span>
          )}
        </div>
        <ConfidenceBadge confidence={explanation.confidence} />
      </div>

      {/* Summary */}
      <p className="text-sm text-foreground/80 leading-snug line-clamp-2 mb-3">
        {explanation.summary}
      </p>

      {/* Footer row */}
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-3 flex-wrap">
          {explanation.root_cause && (
            <span>
              Root cause:{" "}
              <span className="font-medium text-foreground/70">
                {explanation.root_cause.service} — {explanation.root_cause.operation}
              </span>
            </span>
          )}
          {explanation.affected_services.length > 0 && (
            <span>
              Affected:{" "}
              <span className="font-medium text-foreground/70">
                {explanation.affected_services.slice(0, 3).join(", ")}
                {explanation.affected_services.length > 3 &&
                  ` +${explanation.affected_services.length - 3} more`}
              </span>
            </span>
          )}
        </div>
        <span className="shrink-0">{relativeTime(explanation.failure_started_at)}</span>
      </div>

      {/* Hover arrow */}
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/30 group-hover:text-muted-foreground/70 transition-colors text-lg select-none">
        →
      </span>
    </div>
  );
}
