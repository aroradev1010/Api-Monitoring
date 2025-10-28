// src/components/skeletons/AlertsListSkeleton.tsx
export default function AlertsListSkeleton() {
    return (
        <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse p-3 rounded bg-muted">
                    <div className="w-3/4 h-4 bg-surface-500 rounded mb-2" />
                    <div className="w-1/2 h-3 bg-surface-500 rounded" />
                </div>
            ))}
        </div>
    );
}
