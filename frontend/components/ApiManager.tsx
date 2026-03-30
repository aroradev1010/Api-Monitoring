"use client";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, CheckCircle, Plus, Activity } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Api } from "@/types";
import { createApi, deleteApi, listApis } from "@/services/api";
import { showConfirmToast } from "./ConfirmToast";

export default function ApiManager({ onApiCreated }: { onApiCreated?: (id: string) => void }) {
    const [apis, setApis] = useState<Api[]>([]);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        api_id: "",
        name: "",
        base_url: "",
        probe_interval: 30,
        expected_status: "200",
    });
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        reload();
    }, []);

    async function reload() {
        setLoading(true);
        console.log("Reloading APIs...");
        setError(null);
        try {
            setApis(await listApis());
        } catch (e: any) {
            setError(e?.message ?? "Failed to load");
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        const payload: Partial<Api> = {
            api_id: form.api_id.trim(),
            name: form.name.trim(),
            base_url: form.base_url.trim(),
            probe_interval: Number(form.probe_interval) || 30,
            expected_status: form.expected_status.split(",").map((s) => Number(s.trim())),
        };
        try {
            await createApi(payload);
            setForm({ api_id: "", name: "", base_url: "", probe_interval: 30, expected_status: "200" });
            await reload();
            onApiCreated?.(payload.api_id!);
            toast.success("API added successfully");
        } catch (e: any) {
            setError(e?.message ?? "Create failed");
            toast.error(`Failed to add API: ${error ?? e?.message ?? "unknown"}`);
        }
    }

    async function confirmDelete(apiId: string) {
        showConfirmToast({
            title: `Delete API ${apiId}?`,
            description: "This will remove the API and all future probes.",
            confirmLabel: "Delete",
            cancelLabel: "Cancel",
            onConfirm: async () => {
                await deleteApi(apiId);
                window.location.reload()
                toast.success("API deleted");
            },
        });
    }

    return (
        <div className="space-y-8 mt-6">
            <Card className="border-border shadow-sm">
                <CardHeader className="bg-muted/30 pb-4 border-b">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Plus className="w-5 h-5 text-primary" />
                        Add New API
                    </CardTitle>
                    <CardDescription>
                        Register an endpoint to start monitoring uptime and latency
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    {error && (
                        <div className="mb-4 p-3 rounded-md bg-destructive/15 text-destructive text-sm font-medium border border-destructive/20">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleCreate} className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground/90">API ID</label>
                            <Input
                                placeholder="e.g. user-service"
                                value={form.api_id}
                                onChange={(e) => setForm({ ...form, api_id: e.target.value })}
                                required
                                className="bg-background"
                            />
                            <p className="text-[11px] text-muted-foreground">A unique identifier for this API.</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground/90">Name</label>
                            <Input
                                placeholder="e.g. User Auth Service"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                required
                                className="bg-background"
                            />
                            <p className="text-[11px] text-muted-foreground">A human-readable presentation name.</p>
                        </div>
                        <div className="space-y-2 xl:col-span-2">
                            <label className="text-sm font-semibold text-foreground/90">Base URL</label>
                            <Input
                                placeholder="https://api.example.com"
                                value={form.base_url}
                                onChange={(e) => setForm({ ...form, base_url: e.target.value })}
                                required
                                className="bg-background"
                            />
                            <p className="text-[11px] text-muted-foreground">The fully qualified domain name and path prefix.</p>
                        </div>
                        <div className="xl:col-span-2 pt-2">
                            <Button type="submit" className="w-full sm:w-auto shadow-sm transition-all text-sm font-medium">
                                <Plus className="w-4 h-4 mr-2" />
                                Register API
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
                <CardHeader className="bg-muted/30 pb-4 border-b">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary" />
                        Monitored APIs
                    </CardTitle>
                    <CardDescription>
                        Manage your currently monitored endpoints and configurations
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-r-transparent"></div>
                            <span className="text-sm font-medium">Loading APIs...</span>
                        </div>
                    ) : apis.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed rounded-lg border-muted">
                            <h3 className="text-lg font-medium text-foreground/80 mb-1">No APIs Configured</h3>
                            <p className="text-sm text-muted-foreground mb-4">You haven't added any endpoints to monitor yet.</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {apis.map((a) => (
                                <div
                                    key={a.api_id}
                                    className="group flex flex-col sm:flex-row p-4 border rounded-xl bg-card hover:bg-muted/20 transition-all items-start sm:items-center justify-between gap-4 border-border/60 hover:border-primary/30"
                                >
                                    <div className="space-y-1.5 min-w-0 flex-1">
                                        <div className="flex items-center gap-2.5 flex-wrap">
                                            <span className="font-semibold text-foreground truncate max-w-[200px] sm:max-w-xs">{a.name}</span>
                                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono tracking-tight bg-primary/10 text-primary border-primary/20">
                                                {a.api_id}
                                            </Badge>
                                        </div>
                                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse hidden sm:block"></div>
                                            <span className="truncate max-w-[250px] sm:max-w-lg">{a.base_url}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0 opacity-100 sm:opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 sm:flex-none h-8 font-medium hover:bg-primary/5 hover:text-primary hover:border-primary/30"
                                            onClick={() => onApiCreated?.(a.api_id)}
                                        >
                                            <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                                            Select
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="flex-1 sm:flex-none h-8 font-medium text-destructive hover:bg-destructive/10 hover:text-destructive border-transparent sm:border-border hover:border-destructive/30"
                                            onClick={() => confirmDelete(a.api_id)}
                                        >
                                            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

