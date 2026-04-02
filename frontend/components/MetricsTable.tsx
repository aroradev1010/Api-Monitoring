"use client";

import React from "react";
import MetricsTableSkeleton from "./skeletons/MetricsTableSkeleton";
import { Badge } from "@/components/ui/badge";
import type { Event } from "@/types";

type Props = {
    events?: Event[];
    loading?: boolean;
    limit?: number;
};

export default function EventsTable({ events = [], loading = false, limit = 100 }: Props) {
    if (loading) return <MetricsTableSkeleton />;
    if (!events || events.length === 0) return (
        <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed rounded-lg border-muted bg-muted/10">
            <h3 className="text-sm font-medium text-foreground/80 mb-1">No Events Recorded</h3>
            <p className="text-xs text-muted-foreground mb-3 text-center px-4 max-w-sm">No probe data has been recorded for this API yet. Click 'Run Manual Probe' to generate a data point.</p>
        </div>
    );

    // show latest first. Slice to the limit for safety.
    const rows = [...events].sort((a, b) => (new Date(b.started_at)).getTime() - (new Date(a.started_at)).getTime()).slice(0, limit);

    return (
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border/60 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="px-5 py-3.5 font-semibold">Timestamp</th>
                            <th className="px-5 py-3.5 font-semibold">Latency</th>
                            <th className="px-5 py-3.5 font-semibold">Status</th>
                            <th className="px-5 py-3.5 font-semibold max-w-[200px]">Details</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                        {rows.map((e) => {
                            const date = new Date(e.started_at);
                            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                            const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

                            const statusCode = e.http?.status_code ?? 0;
                            const isError = e.status === "error" || e.status === "timeout";

                            return (
                                <tr key={e._id ?? `${e.service}-${e.started_at}`} className="group hover:bg-muted/20 transition-colors bg-card">
                                    <td className="px-5 py-3 align-middle whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <span className="text-foreground font-medium text-[13px]">{timeStr}</span>
                                            <span className="text-[11px] text-muted-foreground">{dateStr}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3 align-middle">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`font-mono text-[13px] font-medium tracking-tight ${e.latency_ms > 1000 ? 'text-amber-500' : 'text-foreground/90'}`}>
                                                {e.latency_ms}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground uppercase">ms</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3 align-middle">
                                        <Badge variant={statusCode >= 500 ? "destructive" : statusCode >= 400 ? "secondary" : "default"}
                                               className={`text-[10px] px-2 py-0 h-5 font-mono ${statusCode >= 400 && statusCode < 500 ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20" : statusCode < 400 ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20" : ""}`}>
                                            <div className="w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 bg-current"></div>
                                            {statusCode || e.status}
                                        </Badge>
                                    </td>
                                    <td className="px-5 py-3 align-middle">
                                        {e.error_message ? (
                                            <span className="text-[11px] text-destructive font-medium bg-destructive/10 px-2 py-1 rounded inline-block max-w-xs truncate" title={e.error_message}>
                                                {e.error_message}
                                            </span>
                                        ) : (
                                            <span className="text-[11px] text-muted-foreground font-mono truncate max-w-[200px] block">
                                                {e.tags && Object.keys(e.tags).length > 0 ? JSON.stringify(e.tags) : <span className="text-muted-foreground/50 italic tracking-widest text-[10px]">OK</span>}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
