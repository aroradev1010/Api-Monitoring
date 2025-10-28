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
import { useStream } from "@/context/stream";
import { toast } from "sonner";
import LastUpdated from "@/components/LastUpdated";

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

    // use top-level stream context
    const stream = useStream();
    const { fallback, connected, reconnect, lastPing } = stream;

    useEffect(() => {
        reloadApis();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!selectedApi) {
            setMetrics([]);
            setAlerts([]);
            return;
        }
        loadMetrics(selectedApi);
        loadAlerts(selectedApi);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedApi]);

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
            await postMetricProbe(selectedApi);
            // rely on SSE to update UI; no re-fetch here
        } catch (e: any) {
            setError(e?.message ?? "Manual probe failed");
        } finally {
            setProbeBusy(false);
        }
    }

    // SSE handlers: update lists + toast
    const handleIncomingMetric = useCallback(
        (m: Metric | any) => {
            setMetrics((prev) => {
                const key = `${m.api_id}:${m.timestamp ?? m.created_at ?? m._id ?? ""}`;
                if (prev.length) {
                    const firstKey = `${prev[0].api_id}:${(prev[0] as any).timestamp ?? (prev[0] as any).created_at ?? (prev[0] as any)._id ?? ""}`;
                    if (firstKey === key) return prev;
                }
                return [m as Metric, ...prev].slice(0, 30);
            });

            toast(`Metric: ${m.api_id} — ${m.latency_ms ?? "?"}ms (${m.status_code ?? "?"})`);
        },
        [] // no dependencies that change identity frequently
    );

    const handleIncomingAlert = useCallback(
        (a: Alert | any) => {
            setAlerts((prev) => {
                const id = (a as any)._id ?? `${a.rule_id}:${a.api_id}:${a.created_at ?? a.timestamp ?? Date.now()}`;
                if (prev.length) {
                    const first = prev[0] as any;
                    const firstId = first._id ?? `${first.rule_id}:${first.api_id}:${first.created_at ?? first.timestamp ?? ""}`;
                    if (firstId === id) return prev;
                }
                return [a as Alert, ...prev].slice(0, 50);
            });

            const short = a.state === "triggered" ? "Triggered" : "Resolved";
            toast(`${short}: ${a.rule_id} (${a.api_id ?? "global"})`, {
                action: {
                    label: "Open",
                    onClick: () => {
                        if (a.api_id) {
                            setSelectedApi(a.api_id);
                            loadAlerts(a.api_id);
                            loadMetrics(a.api_id);
                        }
                    },
                },
            });
        },
        // loadAlerts/loadMetrics captured by reference from component scope; safe to omit here
        []
    );

    // subscribe/unsubscribe when component mounts/unmounts
    useEffect(() => {
        // stream.subscribe should be implemented on your provider and return an unsubscribe function
        // subscription may optionally accept filters (we pass everything and filter in handlers if needed)
        const unsubscribe = stream.subscribe({
            onMetric: (m: any) => {
                // if you want only metrics for selectedApi uncomment:
                // if (selectedApi && m.api_id !== selectedApi) return;
                handleIncomingMetric(m);
            },
            onAlert: (a: any) => {
                // optionally filter alerts by selectedApi
                handleIncomingAlert(a);
            },
        });

        return () => {
            try {
                unsubscribe && unsubscribe();
            } catch { }
        };
    }, [stream, selectedApi, handleIncomingMetric, handleIncomingAlert]);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">API Monitoring</h1>
                    <p className="text-sm text-muted-foreground">Uptime, latency & alerts — minimal dashboard</p>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="ghost" onClick={reloadApis} disabled={loadingApis}>
                        Reload APIs
                    </Button>

                    {/* LastUpdated reads stream.lastPing */}
                    <LastUpdated lastTs={lastPing ?? null} />

                    <Button
                        onClick={() => {
                            if (selectedApi) {
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

            {fallback && (
                <Card>
                    <CardContent>
                        <div className="text-sm text-yellow-700">
                            Live updates degraded — using polling fallback.{" "}
                            <button
                                className="underline ml-2"
                                onClick={() => {
                                    reconnect();
                                    toast.success("Attempting to reconnect SSE...");
                                }}
                            >
                                Retry SSE
                            </button>
                        </div>
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
                            <small className="text-muted-foreground">Manual probes call the server; SSE delivers the resulting metric.</small>
                        </CardFooter>
                    </Card>

                    <ApiManager onApiCreated={(api_id) => { reloadApis(); setSelectedApi(api_id); }} />
                </div>

                {/* Right column */}
                <aside className="col-span-4 space-y-6">
                    <RuleManager api_id={selectedApi} />
                    <Card>
                        <CardHeader><CardTitle>Alerts</CardTitle></CardHeader>
                        <CardContent>
                            <AlertsList alerts={alerts} loading={loadingAlerts} />
                        </CardContent>
                    </Card>
                </aside>
            </div>
        </div>
    );
}
