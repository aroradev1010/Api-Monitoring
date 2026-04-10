"use client";

import { ServiceInfo } from "@/types";
import { useEffect, useState } from "react";
import { listServices } from "@/services/api";

interface Props {
  value: string | undefined;
  onChange: (service: string | undefined) => void;
}

export default function ServiceFilter({ value, onChange }: Props) {
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    listServices()
      .then((data) => {
        // Deduplicate by name — backend may have multiple records per service
        const seen = new Set<string>();
        const unique = (data ?? []).filter((s) => {
          if (seen.has(s.name)) return false;
          seen.add(s.name);
          return true;
        });
        setServices(unique);
      })
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="service-filter"
        className="text-xs font-medium text-muted-foreground shrink-0"
      >
        Service
      </label>
      <select
        id="service-filter"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || undefined)}
        disabled={loading}
        className="text-sm border border-border rounded-md px-2.5 py-1.5 bg-background text-foreground
          focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 cursor-pointer
          min-w-[160px]"
      >
        <option value="">All Services</option>
        {services.map((s) => (
          <option key={s.name} value={s.name}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}
