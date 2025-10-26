// app/dashboard/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardFooter,
} from "@/components/ui/card";
import { Alert, Api, Metric } from "@/types";
import { getMetrics, listAlerts, listApis, postMetricProbe } from "@/services/api";
import ApiSelector from "@/components/ApiSelector";
import ApiManager from "@/components/ApiManager";
import RuleManager from "@/components/RuleManager";
import AlertsList from "@/components/AlertsList";
import MetricsTable from "@/components/MetricsTable";
import { useSSE } from "@/hooks/useSSE";
import { toast } from "sonner";

export default function DashboardPage() {
    const [apis, setApis] = useState<Api[]>([]);
    const [selectedApi, setSelectedApi] = useState<string>("");
    const [metrics, setMetrics] = useState<Metric[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loadingApis, setLoadingApis] = useState(false);
    const [loadingMetrics, setLoadingMetrics] = useState(false);
    const [loadingAlerts, setLoadingAlerts] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [probeBusy, setProbeBusy] = useState(false);

    // initial API list load (single shot)
    useEffect(() => {
        reloadApis();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function reloadApis() {
        setLoadingApis(true);
        setError(null);
        try {
            const data = await listApis();
            setApis(data || []);
            if (data?.length && !selectedApi) setSelectedApi(data[0].api_id);
        } catch (e: any) {
            setError(e?.message ?? "Failed to load APIs");
        } finally {
            setLoadingApis(false);
        }
    }

    // initial snapshot loads for the selected API
    useEffect(() => {
        if (!selectedApi) {
            setMetrics([]);
            setAlerts([]);
            return;
        }
        // load initial snapshot only (stream will keep things live after this)
        loadMetrics(selectedApi);
        loadAlerts(selectedApi);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedApi]);

    async function loadMetrics(api_id: string) {
        setLoadingMetrics(true);
        setError(null);
        try {
            const data = await getMetrics(api_id, 30);
            setMetrics(data || []);
        } catch (e: any) {
            setError(e?.message ?? "Failed to load metrics");
        } finally {
            setLoadingMetrics(false);
        }
    }

    async function loadAlerts(api_id: string) {
        setLoadingAlerts(true);
        setError(null);
        try {
            const data = await listAlerts({ api_id, limit: 20 });
            setAlerts(data || []);
        } catch (e: any) {
            setError(e?.message ?? "Failed to load alerts");
        } finally {
            setLoadingAlerts(false);
        }
    }

    async function runManualProbe() {
        if (!selectedApi) {
            setError("Select an API first to run a manual probe.");
            return;
        }
        setProbeBusy(true);
        setError(null);
        try {
            // call server-side probe — the server will forward metric to ingest and SSE will push it
            await postMetricProbe(selectedApi);
            // do NOT re-fetch here — SSE will deliver the new metric and update UI
        } catch (e: any) {
            setError(e?.message ?? "Manual probe failed");
        } finally {
            setProbeBusy(false);
        }
    }

    // -------- SSE handlers: prepend and toast ----------
    const handleIncomingMetric = useCallback((m: Metric | any) => {
        // Prepend metric and cap at 30 items
        setMetrics((prev) => {
            // avoid duplicates: simple check by timestamp+api_id
            const key = `${m.api_id}:${m.timestamp ?? m.created_at ?? m._id ?? ""}`;
            if (prev.length) {
                const firstKey = `${prev[0].api_id}:${(prev[0] as any).timestamp ?? (prev[0] as any).created_at ?? (prev[0] as any)._id ?? ""}`;
                if (firstKey === key) return prev;
            }
            return [m as Metric, ...prev].slice(0, 30);
        });

        // Show small toast with action
        toast(`Metric: ${m.api_id} — ${m.latency_ms ?? "?"}ms (${m.status_code ?? "?"})`);
    }, []);

    const handleIncomingAlert = useCallback((a: Alert | any) => {
        // Prepend alert (keep max 50)
        setAlerts((prev) => {
            // dedupe by _id if exists or rule_id+timestamp-like key
            const id = (a as any)._id ?? `${a.rule_id}:${a.api_id}:${a.created_at ?? a.timestamp ?? Date.now()}`;
            if (prev.length) {
                const first = prev[0] as any;
                const firstId = first._id ?? `${first.rule_id}:${first.api_id}:${first.created_at ?? first.timestamp ?? ""}`;
                if (firstId === id) return prev;
            }
            return [a as Alert, ...prev].slice(0, 50);
        });

        // Toast the alert (use wording based on state)
        const short = a.state === "triggered" ? "Triggered" : "Resolved";
        toast(`${short}: ${a.rule_id} (${a.api_id ?? "global"})`, {
            action: {
                label: "Open",
                onClick: () => {
                    if (a.api_id) {
                        setSelectedApi(a.api_id);
                        // don't re-fetch because SSE will push relevant events — but we can fetch initial snapshot
                        loadAlerts(a.api_id);
                        loadMetrics(a.api_id);
                    }
                },
            },
        });
    }, []);

    // subscribe to SSE — use the absolute address or env-driven host
    // your useSSE returns connection info and accepts handlers
    useSSE(`${process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3000"}/v1/stream`, {
        onMetric: handleIncomingMetric,
        onAlert: handleIncomingAlert,
    });

    // ----------------------------------------------------

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">API Monitoring</h1>
                    <p className="text-sm text-muted-foreground">
                        Uptime, latency & alerts — minimal dashboard
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="ghost" onClick={reloadApis} disabled={loadingApis}>
                        Reload APIs
                    </Button>
                    <Button
                        onClick={() => {
                            if (selectedApi) {
                                // allow manual refresh of snapshot if needed
                                loadMetrics(selectedApi);
                                loadAlerts(selectedApi);
                            }
                        }}
                    >
                        Refresh
                    </Button>
                </div>
            </header>

            {error && (
                <Card>
                    <CardContent>
                        <div className="text-sm text-red-600">Error: {error}</div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-12 gap-6">
                {/* Left column */}
                <div className="col-span-8 space-y-6">
                    <Card>
                        <CardHeader className="flex items-center justify-between">
                            <CardTitle>APIs</CardTitle>
                            <div className="flex items-center gap-2">
                                <ApiSelector apis={apis} selectedApi={selectedApi} onChange={setSelectedApi} loading={loadingApis} />
                                <Button size="sm" onClick={() => { if (selectedApi) { loadMetrics(selectedApi); loadAlerts(selectedApi); } }}>
                                    Reload
                                </Button>
                            </div>
                        </CardHeader>

                        <CardContent>
                            <div className="flex items-center gap-3 mb-3">
                                <Button onClick={runManualProbe} disabled={probeBusy || !selectedApi}>
                                    {probeBusy ? "Running..." : "Run Manual Probe"}
                                </Button>
                            </div>

                            <div>
                                <h3 className="font-medium mb-2">Recent Metrics</h3>
                                <MetricsTable metrics={metrics} loading={loadingMetrics} />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <small className="text-muted-foreground">
                                Manual probes call the server; SSE delivers the resulting metric.
                            </small>
                        </CardFooter>
                    </Card>

                    <ApiManager onApiCreated={(api_id) => { reloadApis(); setSelectedApi(api_id); }} />
                </div>

                {/* Right column */}
                <aside className="col-span-4 space-y-6">
                    <RuleManager api_id={selectedApi} />
                    <Card>
                        <CardHeader>
                            <CardTitle>Alerts</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <AlertsList alerts={alerts} loading={loadingAlerts} />
                        </CardContent>
                    </Card>
                </aside>
            </div>
        </div>
    );
}
