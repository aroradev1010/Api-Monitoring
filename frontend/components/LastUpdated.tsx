// src/components/LastUpdated.tsx
"use client";
import React, { useEffect, useState } from "react";

export default function LastUpdated({ lastTs }: { lastTs: number | null }) {
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);
    if (!lastTs) return <span className="text-sm text-muted-foreground">No data yet</span>;
    const seconds = Math.floor((now - lastTs) / 1000);
    if (seconds < 5) return <span className="text-sm text-muted-foreground">Updated just now</span>;
    if (seconds < 60) return <span className="text-sm text-muted-foreground">Updated {seconds}s ago</span>;
    const mins = Math.floor(seconds / 60);
    return <span className="text-sm text-muted-foreground">Updated {mins}m ago</span>;
}
