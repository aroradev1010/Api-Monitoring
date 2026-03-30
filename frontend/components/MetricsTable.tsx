"use client";

import React from "react";
import MetricsTableSkeleton from "./skeletons/MetricsTableSkeleton";
import { Badge } from "@/components/ui/badge";

export type Metric = {
    _id?: string;
    api_id: string;
    timestamp: string;
    latency_ms: number;
    status_code: number;
    error?: string | null;
    tags?: Record<string, any>;
};

type Props = {
    metrics?: Metric[];
    loading?: boolean;
    limit?: number;
};

export default function MetricsTable({ metrics = [], loading = false, limit = 100 }: Props) {
    if (loading) return <MetricsTableSkeleton />;
    if (!metrics || metrics.length === 0) return (
        <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed rounded-lg border-muted bg-muted/10">
            <h3 className="text-sm font-medium text-foreground/80 mb-1">No Metrics Recorded</h3>
            <p className="text-xs text-muted-foreground mb-3 text-center px-4 max-w-sm">No probe data has been recorded for this API yet. Click 'Run Manual Probe' to generate a data point.</p>
        </div>
    );

    // show latest first (assumes timestamp is ISO string). Slice to the limit for safety.
    const rows = [...metrics].sort((a, b) => (new Date(b.timestamp)).getTime() - (new Date(a.timestamp)).getTime()).slice(0, limit);

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
                        {rows.map((m) => {
                            const date = new Date(m.timestamp);
                            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                            const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                            
                            const isError = m.status_code >= 400 || !!m.error;
                            
                            return (
                                <tr key={m._id ?? `${m.api_id}-${m.timestamp}`} className="group hover:bg-muted/20 transition-colors bg-card">
                                    <td className="px-5 py-3 align-middle whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <span className="text-foreground font-medium text-[13px]">{timeStr}</span>
                                            <span className="text-[11px] text-muted-foreground">{dateStr}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3 align-middle">
                                        <div className="flex items-center gap-1.5">
                                            <span className={`font-mono text-[13px] font-medium tracking-tight ${m.latency_ms > 1000 ? 'text-amber-500' : 'text-foreground/90'}`}>
                                                {m.latency_ms}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground uppercase">ms</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3 align-middle">
                                        <Badge variant={m.status_code >= 500 ? "destructive" : m.status_code >= 400 ? "secondary" : "default"} 
                                               className={`text-[10px] px-2 py-0 h-5 font-mono ${m.status_code >= 400 && m.status_code < 500 ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20" : m.status_code < 400 ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20" : ""}`}>
                                            <div className="w-1.5 h-1.5 rounded-full mr-1.5 shrink-0 bg-current"></div>
                                            {m.status_code}
                                        </Badge>
                                    </td>
                                    <td className="px-5 py-3 align-middle">
                                        {m.error ? (
                                            <span className="text-[11px] text-destructive font-medium bg-destructive/10 px-2 py-1 rounded inline-block max-w-xs truncate" title={m.error}>
                                                {m.error}
                                            </span>
                                        ) : (
                                            <span className="text-[11px] text-muted-foreground font-mono truncate max-w-[200px] block">
                                                {m.tags && Object.keys(m.tags).length > 0 ? JSON.stringify(m.tags) : <span className="text-muted-foreground/50 italic tracking-widest text-[10px]">OK</span>}
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
