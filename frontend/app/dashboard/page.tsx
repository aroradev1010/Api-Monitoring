// app/dashboard/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, Api, Metric } from "@/types";
import { getMetrics, listAlerts, listApis, postMetricSynthetic } from "@/services/api";
import ApiSelector from "@/components/ApiSelector";
import ApiManager from "@/components/ApiManager";
import RuleManager from "@/components/RuleManager";
import AlertsList from "@/components/AlertsList";
import MetricsTable from "@/components/MetricsTable";

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

    useEffect(() => {
        reloadApis();
    }, []);

    useEffect(() => {
        if (!selectedApi) {
            setMetrics([]);
            setAlerts([]);
            return;
        }
        loadMetrics(selectedApi);
        loadAlerts(selectedApi);
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
            // post a synthetic metric — backend will accept it via /v1/metrics
            await postMetricSynthetic(selectedApi);
            // reload data
            await loadMetrics(selectedApi);
            await loadAlerts(selectedApi);
        } catch (e: any) {
            setError(e?.message ?? "Manual probe failed");
        } finally {
            setProbeBusy(false);
        }
    }

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">API Monitoring</h1>
                    <p className="text-sm text-muted-foreground">Uptime, latency & alerts — minimal dashboard</p>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="ghost" onClick={reloadApis} disabled={loadingApis}>Reload APIs</Button>
                    <Button onClick={() => { if (selectedApi) { loadMetrics(selectedApi); loadAlerts(selectedApi); } }}>Refresh</Button>
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
                                <Button size="sm" onClick={() => { if (selectedApi) { loadMetrics(selectedApi); loadAlerts(selectedApi); } }}>Reload</Button>
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
                            <small className="text-muted-foreground">Manual probes create a synthetic metric for testing.</small>
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
