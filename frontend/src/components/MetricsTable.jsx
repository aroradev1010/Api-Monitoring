import React from "react";

export default function MetricsTable({ metrics, loading }) {
  if (loading) return <div>Loading metrics...</div>;
  if (!metrics || metrics.length === 0) return <div>No metrics yet</div>;

  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr style={{ textAlign: "left" }}>
          <th>Timestamp</th>
          <th>Latency (ms)</th>
          <th>Status</th>
          <th>Error</th>
        </tr>
      </thead>
      <tbody>
        {metrics.map((m) => (
          <tr key={m._id || `${m.api_id}-${m.timestamp}`}>
            <td>{new Date(m.timestamp).toLocaleString()}</td>
            <td>{m.latency_ms}</td>
            <td>{m.status_code}</td>
            <td style={{ color: "red" }}>{m.error || "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
