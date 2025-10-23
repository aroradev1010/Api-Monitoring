import React from "react";

export default function AlertsList({ alerts, loading }) {
  if (loading) return <div>Loading alerts...</div>;
  if (!alerts || alerts.length === 0) return <div>No alerts</div>;

  return (
    <div>
      <h3>Alerts</h3>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {alerts.map((a) => (
          <li
            key={a._id || `${a.rule_id}-${a.api_id}-${a.created_at}`}
            style={{
              marginBottom: 8,
              borderLeft:
                a.state === "triggered"
                  ? "4px solid #d9534f"
                  : "4px solid #5cb85c",
              paddingLeft: 8,
            }}
          >
            <div>
              <strong>{a.state.toUpperCase()}</strong> — {a.rule_id} /{" "}
              {a.api_id}
            </div>
            <div style={{ fontSize: 12, color: "#666" }}>
              {new Date(a.created_at).toLocaleString()}
            </div>
            <div
              style={{
                whiteSpace: "pre-wrap",
                fontFamily: "monospace",
                fontSize: 12,
              }}
            >
              {JSON.stringify(a.payload)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
