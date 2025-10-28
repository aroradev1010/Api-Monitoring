// src/components/AlertsList.tsx
"use client";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/types";
import AlertsListSkeleton from "./skeletons/AlertsListSkeleton";

export default function AlertsList({ alerts, loading }: { alerts: Alert[]; loading?: boolean }) {
    if (loading) return <AlertsListSkeleton />;
    if (!alerts || alerts.length === 0) return <div className="text-sm text-muted-foreground">No alerts</div>;

    return (
        <ul className="space-y-3">
            {alerts.map((a) => (
                <li key={a._id ?? `${a.rule_id}-${a.api_id}`} className="p-2 border rounded">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-medium">{a.rule_id}</div>
                            <div className="text-xs text-muted-foreground">{a.api_id}</div>
                        </div>
                        <Badge variant={a.state === "triggered" ? "destructive" : "secondary"}>{a.state.toUpperCase()}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
                </li>
            ))}
        </ul>
    );
}
