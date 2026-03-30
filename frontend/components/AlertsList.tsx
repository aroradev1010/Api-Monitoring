// src/components/AlertsList.tsx
"use client";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/types";
import AlertsListSkeleton from "./skeletons/AlertsListSkeleton";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function AlertsList({ alerts, loading }: { alerts: Alert[]; loading?: boolean }) {
    if (loading) return <AlertsListSkeleton />;
    
    if (!alerts || alerts.length === 0) return (
        <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed rounded-lg border-muted bg-muted/5">
            <h3 className="text-sm font-medium text-foreground/80 mb-1">No Alerts Recorded</h3>
            <p className="text-xs text-muted-foreground text-center px-4">There are no recent alerts for this endpoint.</p>
        </div>
    );

    return (
        <ul className="space-y-3">
            {alerts.map((a) => (
                <li key={a._id ?? `${a.rule_id}-${a.api_id}`} 
                    className={`p-3.5 border rounded-xl overflow-hidden transition-all shadow-sm ${a.state === 'triggered' ? 'bg-destructive/5 border-destructive/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                    <div className="flex items-start gap-3">
                        <div className={`mt-0.5 shrink-0 ${a.state === 'triggered' ? 'text-destructive' : 'text-emerald-500'}`}>
                            {a.state === 'triggered' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                                <div className="font-semibold text-sm truncate pr-2 text-foreground/90">{a.rule_id}</div>
                                <Badge variant="outline" className={`shrink-0 text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0 h-4 border-transparent ${a.state === 'triggered' ? 'bg-destructive text-destructive-foreground' : 'bg-emerald-500 text-white'}`}>
                                    {a.state}
                                </Badge>
                            </div>
                            <div className="text-[11px] text-muted-foreground/70 font-mono truncate mb-2.5">
                                API: {a.api_id}
                            </div>
                            <div className="text-[10px] text-muted-foreground border-t border-border/40 pt-2.5 flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${a.state === 'triggered' ? 'bg-destructive/40' : 'bg-emerald-500/40'}`}></span>
                                {new Date(a.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            </div>
                        </div>
                    </div>
                </li>
            ))}
        </ul>
    );
}
