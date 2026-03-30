// src/components/skeletons/MetricsTableSkeleton.tsx
export default function MetricsTableSkeleton() {
    return (
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 border-b border-border/60">
                        <tr>
                            <th className="px-5 py-3.5"><div className="w-24 h-4 bg-muted animate-pulse rounded"></div></th>
                            <th className="px-5 py-3.5"><div className="w-16 h-4 bg-muted animate-pulse rounded"></div></th>
                            <th className="px-5 py-3.5"><div className="w-20 h-4 bg-muted animate-pulse rounded"></div></th>
                            <th className="px-5 py-3.5"><div className="w-32 h-4 bg-muted animate-pulse rounded"></div></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i}>
                                <td className="px-5 py-4"><div className="w-28 h-4 bg-muted animate-pulse rounded"></div></td>
                                <td className="px-5 py-4"><div className="w-14 h-4 bg-muted animate-pulse rounded"></div></td>
                                <td className="px-5 py-4"><div className="w-16 h-5 bg-muted animate-pulse rounded-full"></div></td>
                                <td className="px-5 py-4"><div className="w-48 h-4 bg-muted animate-pulse rounded"></div></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
