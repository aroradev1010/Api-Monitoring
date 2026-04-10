"use client";

import { CausalChainNode } from "@/types";

const ROLE_STYLES: Record<
  CausalChainNode["role"],
  { label: string; badge: string; border: string; bg: string }
> = {
  root_cause: {
    label: "Root Cause",
    badge:
      "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
    border: "border-red-400 dark:border-red-600",
    bg: "bg-red-50 dark:bg-red-950/30",
  },
  propagation: {
    label: "Propagation",
    badge:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400",
    border: "border-orange-300 dark:border-orange-700",
    bg: "bg-orange-50/60 dark:bg-orange-950/20",
  },
  consequence: {
    label: "Consequence",
    badge:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
    border: "border-yellow-300 dark:border-yellow-700",
    bg: "bg-yellow-50/60 dark:bg-yellow-950/20",
  },
  context: {
    label: "Context",
    badge:
      "bg-muted text-muted-foreground",
    border: "border-border",
    bg: "bg-muted/30",
  },
};

const STATUS_STYLES: Record<string, string> = {
  error: "text-red-600 dark:text-red-400 font-semibold",
  timeout: "text-orange-600 dark:text-orange-400 font-semibold",
  ok: "text-emerald-600 dark:text-emerald-400 font-semibold",
};

interface Props {
  chain: CausalChainNode[];
}

export default function CausalChain({ chain }: Props) {
  if (!chain || chain.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No causal chain data available.
      </p>
    );
  }

  return (
    <ol className="relative flex flex-col gap-0" aria-label="Causal chain">
      {chain.map((node, idx) => {
        const styles = ROLE_STYLES[node.role] ?? ROLE_STYLES.context;
        const isLast = idx === chain.length - 1;
        const isRootCause = node.role === "root_cause";

        return (
          <li key={node.event_id} className="flex gap-0">
            {/* Timeline stem + dot */}
            <div className="flex flex-col items-center mr-4">
              <div
                className={[
                  "w-3 h-3 rounded-full border-2 mt-1 shrink-0 z-10",
                  isRootCause
                    ? "border-red-500 bg-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.2)]"
                    : "border-border bg-background",
                ].join(" ")}
              />
              {!isLast && (
                <div className="w-px flex-1 min-h-[24px] bg-border mt-1" />
              )}
            </div>

            {/* Node card */}
            <div
              className={[
                "flex-1 mb-3 rounded-lg border px-4 py-3",
                styles.border,
                styles.bg,
              ].join(" ")}
            >
              {/* Header row */}
              <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {node.service}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {node.operation}
                  </span>
                </div>
                <span
                  className={[
                    "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
                    styles.badge,
                  ].join(" ")}
                >
                  {styles.label}
                </span>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                <span className={STATUS_STYLES[node.status] ?? ""}>
                  {node.status.toUpperCase()}
                </span>
                <span>{node.latency_ms.toLocaleString()} ms</span>
                {node.error_code && (
                  <span className="font-mono text-[11px] text-red-500 dark:text-red-400">
                    {node.error_code}
                  </span>
                )}
              </div>

              {/* Error message */}
              {node.error_message && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 font-mono leading-snug">
                  {node.error_message}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
