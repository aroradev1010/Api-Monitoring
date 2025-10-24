// src/components/ApiSelector.tsx
"use client";
import { Api } from "@/types";
import React from "react";

type Props = {
    apis: Api[];
    selectedApi: string;
    onChange: (id: string) => void;
    loading?: boolean;
};

export default function ApiSelector({ apis, selectedApi, onChange, loading }: Props) {
    return (
        <select
            value={selectedApi}
            onChange={(e) => onChange(e.target.value)}
            className="px-2 py-1 border rounded"
            disabled={loading}
            aria-label="Select monitored API"
        >
            {loading ? <option>Loading...</option> : null}
            {!loading && apis.length === 0 ? <option>No APIs</option> : null}
            {apis.map((a) => (
                <option key={a.api_id} value={a.api_id}>
                    {a.name} ({a.api_id})
                </option>
            ))}
        </select>
    );
}
