// src/components/skeletons/AlertsListSkeleton.tsx
export default function AlertsListSkeleton() {
    return (
        <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse p-4 border border-border/60 rounded-xl bg-card flex gap-3 shadow-sm">
                    <div className="w-4 h-4 rounded-full bg-muted shrink-0" />
                    <div className="flex-1 space-y-2.5">
                        <div className="flex justify-between items-center">
                            <div className="w-32 h-4 bg-muted rounded" />
                            <div className="w-16 h-4 bg-muted rounded" />
                        </div>
                        <div className="w-24 h-3 bg-muted/60 rounded" />
                        <div className="pt-2.5 border-t border-border/40 mt-1">
                            <div className="w-32 h-2.5 bg-muted/60 rounded" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
