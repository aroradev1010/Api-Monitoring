"use client";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, AlertTriangle, Activity, Settings2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

    if (!api_id) {
        return (
            <Card className="border-border shadow-sm border-dashed bg-muted/20 mt-6">
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                    <Settings2 className="w-10 h-10 opacity-40 mb-2" />
                    <span className="text-base font-medium text-foreground/80">No API Selected</span>
                    <span className="text-sm">Select an API from the list to view and manage its measurement rules.</span>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-8 mt-6">
            <Card className="border-border shadow-sm">
                <CardHeader className="bg-muted/30 pb-4 border-b">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Plus className="w-5 h-5 text-primary" />
                        Add New Rule
                    </CardTitle>
                    <CardDescription>
                        Define alerting conditions for this API endpoint
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
                            <label className="text-sm font-semibold text-foreground/90">Rule ID</label>
                            <Input
                                placeholder="e.g. high-latency-alert"
                                value={form.rule_id}
                                onChange={(e) => setForm({ ...form, rule_id: e.target.value })}
                                required
                                className="bg-background"
                            />
                            <p className="text-[11px] text-muted-foreground">A unique identifier for this rule.</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground/90">Name</label>
                            <Input
                                placeholder="e.g. Latency > 1000ms"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                required
                                className="bg-background"
                            />
                            <p className="text-[11px] text-muted-foreground">A human-readable presentation name.</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground/90">Rule Type</label>
                            <Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value })}>
                                <SelectTrigger className="bg-background">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="latency_gt">Latency &gt; (ms)</SelectItem>
                                    <SelectItem value="status_not">Status not in</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-[11px] text-muted-foreground">The condition to trigger this rule.</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground/90">Threshold</label>
                            <Input
                                placeholder="e.g. 1000"
                                value={form.threshold}
                                onChange={(e) => setForm({ ...form, threshold: Number(e.target.value) })}
                                required
                                type="number"
                                className="bg-background"
                            />
                            <p className="text-[11px] text-muted-foreground">The value that will trigger the alert when exceeded/matched.</p>
                        </div>
                        <div className="xl:col-span-2 pt-2">
                            <Button type="submit" className="w-full sm:w-auto shadow-sm transition-all text-sm font-medium">
                                <Plus className="w-4 h-4 mr-2" />
                                Create Rule
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
                <CardHeader className="bg-muted/30 pb-4 border-b">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary" />
                        Active Rules
                    </CardTitle>
                    <CardDescription>
                        Current monitoring rules configured for this API
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-r-transparent"></div>
                            <span className="text-sm font-medium">Loading rules...</span>
                        </div>
                    ) : (rules ?? []).length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed rounded-lg border-muted">
                            <h3 className="text-lg font-medium text-foreground/80 mb-1">No Rules Configured</h3>
                            <p className="text-sm text-muted-foreground mb-4">You haven't added any monitoring rules for this API yet.</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {(rules ?? []).map((r) => (
                                <div 
                                    key={r.rule_id} 
                                    className="group flex flex-col sm:flex-row p-4 border rounded-xl bg-card hover:bg-muted/20 transition-all items-start sm:items-center justify-between gap-4 border-border/60 hover:border-primary/30"
                                >
                                    <div className="space-y-1.5 min-w-0 flex-1">
                                        <div className="flex items-center gap-2.5 flex-wrap">
                                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                                            <span className="font-semibold text-foreground truncate max-w-[200px] sm:max-w-xs">{r.name}</span>
                                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono tracking-tight bg-primary/10 text-primary border-primary/20">
                                                {r.rule_id}
                                            </Badge>
                                        </div>
                                        <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                                            <Badge variant="outline" className="font-mono text-[10px] uppercase">
                                                {r.type === 'latency_gt' ? 'LATENCY >' : r.type === 'status_not' ? 'STATUS !=' : r.type}
                                            </Badge>
                                            <span className="font-medium text-foreground/80">{r.threshold}</span>
                                            {r.type === 'latency_gt' && <span className="text-xs">ms</span>}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0 opacity-100 sm:opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                                        <Button 
                                            size="sm" 
                                            variant="outline" 
                                            className="flex-1 sm:flex-none h-8 font-medium text-destructive hover:bg-destructive/10 hover:text-destructive border-transparent sm:border-border hover:border-destructive/30" 
                                            onClick={() => confirmDelete(r.rule_id)}
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
