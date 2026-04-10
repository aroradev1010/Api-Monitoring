"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Explanation } from "@/types";
import { getExplanationById } from "@/services/api";
import ExplanationView from "@/components/ExplanationView";
import Link from "next/link";

export default function ExplanationDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";

  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getExplanationById(id);
      setExplanation(data);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load explanation");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <div className="h-4 w-24 rounded bg-muted animate-pulse" />
        <div className="h-7 w-2/3 rounded bg-muted animate-pulse" />
        <div className="space-y-3 mt-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </main>
    );
  }

  if (error || !explanation) {
    return (
      <main className="max-w-3xl mx-auto px-6 py-10 flex flex-col items-center gap-4 text-center">
        <span className="text-4xl">⚠</span>
        <p className="text-base font-medium">{error ?? "Explanation not found"}</p>
        <button
          id="explanation-retry"
          onClick={load}
          className="text-sm px-4 py-2 rounded-lg border border-border hover:bg-muted/50 transition-colors"
        >
          Retry
        </button>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Incidents
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <ExplanationView explanation={explanation} />
    </main>
  );
}
