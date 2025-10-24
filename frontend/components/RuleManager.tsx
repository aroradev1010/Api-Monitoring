"use client";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Rule } from "@/types";
import { createRule, deleteRule, listRules } from "@/services/api";
import { showConfirmToast } from "./ConfirmToast";

export default function RuleManager({ api_id }: { api_id?: string }) {
    const [rules, setRules] = useState<Rule[]>([]);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ rule_id: "", name: "", type: "latency_gt", threshold: 1000 });
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (api_id) reload();
        else setRules([]);
    }, [api_id]);

    async function reload() {
        setLoading(true);
        setError(null);
        try {
            setRules(await listRules(api_id));
        } catch (e: any) {
            setError(e?.message ?? "Failed to load");
        } finally {
            setLoading(false);
        }
    }

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        try {
            await createRule({
                rule_id: form.rule_id.trim(),
                name: form.name.trim(),
                api_id: api_id ?? null,
                type: form.type,
                threshold: Number(form.threshold),
            });
            setForm({ rule_id: "", name: "", type: "latency_gt", threshold: 1000 });
            await reload();
            toast.success("Rule created");
        } catch (e: any) {
            setError(e?.message ?? "Create failed");
            toast.error(`Failed to create rule: ${e?.message ?? "unknown"}`);
        }
    }

    async function confirmDelete(ruleId: string) {
        showConfirmToast({
            title: `Delete rule ${ruleId}?`,
            description: "This action cannot be undone.",
            confirmLabel: "Delete",
            cancelLabel: "Cancel",
            onConfirm: async () => {
                await deleteRule(ruleId);
                await reload(); // reload rules list (assume reload is in scope)
                // optional: show success or let utility show default "Done"
                toast.success("Rule deleted");
            },
            onCancel: () => {
                // optional: any cancellation logic
            },
        });
    }

    if (!api_id) return <div>Select an API to manage rules</div>;

    return (
        <div className="mb-4">
            <h3 className="text-lg font-medium mb-2">Rules</h3>
            {error && <div className="text-red-600 text-sm mb-2">{error}</div>}

            <form onSubmit={handleCreate} className="flex gap-2 flex-wrap items-center mb-3">
                <input
                    placeholder="rule_id"
                    value={form.rule_id}
                    onChange={(e) => setForm({ ...form, rule_id: e.target.value })}
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
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="px-2 py-1 border rounded">
                    <option value="latency_gt">Latency &gt; (ms)</option>
                    <option value="status_not">Status not in</option>
                </select>
                <input
                    placeholder="threshold"
                    value={form.threshold}
                    onChange={(e) => setForm({ ...form, threshold: Number(e.target.value) })}
                    className="px-2 py-1 border rounded w-24"
                />
                <Button type="submit">Add</Button>
            </form>

            <div>
                {loading ? (
                    <div>Loading rules...</div>
                ) : (
                    <ul className="space-y-2">
                        {rules.map((r) => (
                            <li key={r.rule_id} className="flex items-center justify-between">
                                <div>
                                    <div className="font-medium">{r.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {r.type} {r.threshold}
                                    </div>
                                </div>
                                <div>
                                    <Button size="sm" variant="destructive" onClick={() => confirmDelete(r.rule_id)}>
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
