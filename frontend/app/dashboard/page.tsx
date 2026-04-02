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
import { Alert, Api, Event } from "@/types";
import { getEvents, listAlerts, listApis, postProbe } from "@/services/api";
import ApiSelector from "@/components/ApiSelector";
import ApiManager from "@/components/ApiManager";
import RuleManager from "@/components/RuleManager";
import AlertsList from "@/components/AlertsList";
import EventsTable from "@/components/MetricsTable";
import { useStream } from "@/context/stream";
import { toast } from "sonner";
import LastUpdated from "@/components/LastUpdated";
import { Activity, RefreshCw, Loader2, Play, Info, BellRing } from "lucide-react";
export default function DashboardPage() {
    const [apis, setApis] = useState<Api[]>([]);
    const [selectedApi, setSelectedApi] = useState<string>("");
    const [events, setEvents] = useState<Event[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loadingApis, setLoadingApis] = useState(false);
    const [loadingEvents, setLoadingEvents] = useState(false);
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
            setEvents([]);
            setAlerts([]);
            return;
        }
        loadEvents(selectedApi);
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

    async function loadEvents(service: string) {
        setLoadingEvents(true);
        setError(null);
        try {
            const data = await getEvents(service, 30);
            setEvents(data || []);
        } catch (e: any) {
            setError(e?.message ?? "Failed to load events");
        } finally {
            setLoadingEvents(false);
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
            await postProbe(selectedApi);
            // rely on SSE to update UI; no re-fetch here
        } catch (e: any) {
            setError(e?.message ?? "Manual probe failed");
        } finally {
            setProbeBusy(false);
        }
    }

    // SSE handlers: update lists + toast
    const handleIncomingEvent = useCallback(
        (e: Event | any) => {
            setEvents((prev) => {
                const key = `${e.service}:${e.started_at ?? e._id ?? ""}`;
                if (prev.length) {
                    const firstKey = `${prev[0].service}:${prev[0].started_at ?? (prev[0] as any)._id ?? ""}`;
                    if (firstKey === key) return prev;
                }
                return [e as Event, ...prev].slice(0, 30);
            });

            toast(`Event: ${e.service} — ${e.latency_ms ?? "?"}ms (${e.http?.status_code ?? e.status ?? "?"})`);
        },
        []
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
                            loadEvents(a.api_id);
                        }
                    },
                },
            });
        },
        []
    );

    // subscribe/unsubscribe when component mounts/unmounts
    useEffect(() => {
        const unsubscribe = stream.subscribe({
            onEvent: (e: any) => {
                handleIncomingEvent(e);
            },
            onAlert: (a: any) => {
                handleIncomingAlert(a);
            },
        });

        return () => {
            try {
                unsubscribe && unsubscribe();
            } catch { }
        };
    }, [stream, selectedApi, handleIncomingEvent, handleIncomingAlert]);

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
                                loadEvents(selectedApi);
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
                    <Card className="border-border shadow-sm overflow-hidden">
                        <CardHeader className="bg-muted/30 pb-4 border-b flex sm:flex-row flex-col items-start sm:items-center justify-between gap-4 space-y-0">
                            <div className="flex items-center gap-2">
                                <Activity className="w-5 h-5 text-primary" />
                                <div>
                                    <CardTitle className="text-lg">API Performance Hub</CardTitle>
                                    <p className="text-xs text-muted-foreground mt-0.5">Select an API to view its real-time telemetry</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <div className="flex-1 sm:flex-none max-w-[200px]">
                                    <ApiSelector apis={apis} selectedApi={selectedApi} onChange={setSelectedApi} loading={loadingApis} />
                                </div>
                                <Button size="icon" variant="outline" className="h-9 w-9 shrink-0 hover:bg-primary/5 hover:text-primary transition-colors border-border/60 hover:border-primary/30" onClick={() => { if (selectedApi) { loadEvents(selectedApi); loadAlerts(selectedApi); } }} title="Reload Data">
                                    <RefreshCw className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>

                        <CardContent className="pt-6">
                            <div className="flex sm:flex-row flex-col items-start sm:items-center justify-between mb-5 gap-3">
                                <h3 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
                                    <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                                    Recent Events
                                </h3>
                                <Button size="sm" onClick={runManualProbe} disabled={probeBusy || !selectedApi} className="shadow-sm w-full sm:w-auto transition-all h-8">
                                    {probeBusy ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Play className="w-3.5 h-3.5 mr-2" />}
                                    {probeBusy ? "Running Probe..." : "Run Manual Probe"}
                                </Button>
                            </div>

                            <EventsTable events={events} loading={loadingEvents} />
                        </CardContent>
                        <CardFooter className="bg-muted/20 border-t py-2.5 px-6">
                            <small className="text-muted-foreground flex items-center gap-1.5"><Info className="w-3.5 h-3.5 shrink-0" /> Manual probes contact the server immediately. Data is delivered via low-latency SSE.</small>
                        </CardFooter>
                    </Card>

                    <ApiManager onApiCreated={(api_id) => { reloadApis(); setSelectedApi(api_id); }} />
                </div>

                {/* Right column */}
                <aside className="col-span-4 space-y-6">
                    <RuleManager api_id={selectedApi} />
                    <Card className="border-border shadow-sm">
                        <CardHeader className="bg-muted/30 pb-4 border-b">
                            <div className="flex items-center gap-2">
                                <BellRing className="w-5 h-5 text-primary" />
                                <div>
                                    <CardTitle className="text-lg">Recent Alerts</CardTitle>
                                    <p className="text-xs text-muted-foreground mt-0.5">Status changes and triggered rules</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <AlertsList alerts={alerts} loading={loadingAlerts} />
                        </CardContent>
                    </Card>
                </aside>
            </div>
        </div>
    );
}
