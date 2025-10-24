"use client";

import React from "react";

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
    if (loading) return <div className="p-4">Loading metrics...</div>;
    if (!metrics || metrics.length === 0) return <div className="p-4 text-sm text-muted-foreground">No metrics yet</div>;

    // show latest first (assumes timestamp is ISO string). Slice to the limit for safety.
    const rows = [...metrics].sort((a, b) => (new Date(b.timestamp)).getTime() - (new Date(a.timestamp)).getTime()).slice(0, limit);

    return (
        <div className="overflow-x-auto border rounded">
            <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-gray-50 dark:bg-slate-800">
                    <tr>
                        <th className="px-3 py-2 text-left">Timestamp</th>
                        <th className="px-3 py-2 text-left">Latency (ms)</th>
                        <th className="px-3 py-2 text-left">Status</th>
                        <th className="px-3 py-2 text-left">Error</th>
                        <th className="px-3 py-2 text-left">Tags</th>
                    </tr>
                </thead>

                <tbody>
                    {rows.map((m) => (
                        <tr key={m._id ?? `${m.api_id}-${m.timestamp}`} className="even:bg-white odd:bg-gray-50 dark:even:bg-slate-900 dark:odd:bg-slate-800">
                            <td className="px-3 py-2 align-top">
                                <div className="text-xs text-muted-foreground">
                                    {new Date(m.timestamp).toLocaleString()}
                                </div>
                            </td>

                            <td className="px-3 py-2 align-top">
                                <div className="font-medium">{m.latency_ms}</div>
                            </td>

                            <td className="px-3 py-2 align-top">
                                <div>{m.status_code}</div>
                            </td>

                            <td className="px-3 py-2 align-top">
                                <div className="text-xs text-rose-600">{m.error ?? "-"}</div>
                            </td>

                            <td className="px-3 py-2 align-top">
                                <div className="text-xs font-mono whitespace-pre-wrap">
                                    {m.tags ? JSON.stringify(m.tags) : "-"}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
