// src/components/skeletons/MetricsTableSkeleton.tsx
export default function MetricsTableSkeleton() {
    return (
        <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-muted p-3 rounded flex justify-between">
                    <div className="w-2/3 h-4 bg-surface-500 rounded" />
                    <div className="w-24 h-4 bg-surface-500 rounded" />
                </div>
            ))}
        </div>
    );
}
