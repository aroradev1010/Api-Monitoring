"use client";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
            toast.success("API added");
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
        <div className="mt-4">
            <h3 className="text-lg font-medium mb-2">Manage APIs</h3>
            {error && <div className="text-red-600 text-sm mb-2">{error}</div>}

            <form onSubmit={handleCreate} className="flex gap-2 flex-wrap items-center mb-4">
                <input
                    placeholder="api_id"
                    value={form.api_id}
                    onChange={(e) => setForm({ ...form, api_id: e.target.value })}
                    required
                    className="px-2 py-1 border rounded"
                />
                <input
                    placeholder="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    className="px-2 py-1 border rounded"
                />
                <input
                    placeholder="base_url"
                    value={form.base_url}
                    onChange={(e) => setForm({ ...form, base_url: e.target.value })}
                    required
                    className="px-2 py-1 border rounded w-64"
                />
                <Button type="submit">Add API</Button>
            </form>

            <div>
                {loading ? (
                    <div>Loading...</div>
                ) : (
                    <ul className="space-y-2">
                        {apis.map((a) => (
                            <li key={a.api_id} className="flex items-center justify-between">
                                <div>
                                    <div className="font-medium">{a.name}</div>
                                    <div className="text-xs text-muted-foreground">{a.base_url}</div>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={() => onApiCreated?.(a.api_id)}>
                                        Select
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={() => confirmDelete(a.api_id)}>
                                        Delete
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
