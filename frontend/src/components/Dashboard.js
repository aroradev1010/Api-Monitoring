import React, { useEffect, useState } from "react";

export default function Dashboard() {
  const BACKEND = process.env.REACT_APP_BACKEND_URL || "http://localhost:3000";

  const [apis, setApis] = useState([]);
  const [selectedApi, setSelectedApi] = useState("");
  const [metrics, setMetrics] = useState([]);
  const [loadingApis, setLoadingApis] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoadingApis(true);
    fetch(`${BACKEND}/v1/apis`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to fetch apis: ${r.status}`);
        return r.json();
      })
      .then((data) => {
        setApis(data || []);
        if (data && data.length && !selectedApi) setSelectedApi(data[0].api_id);
      })
      .catch((err) => setError(err.message || "Unknown error"))
      .finally(() => setLoadingApis(false));
  }, [BACKEND, selectedApi]);

  useEffect(() => {
    if (!selectedApi) {
      setMetrics([]);
      return;
    }
    setLoadingMetrics(true);
    fetch(`${BACKEND}/v1/metrics?api_id=${selectedApi}&limit=20`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to fetch metrics: ${r.status}`);
        return r.json();
      })
      .then((data) => setMetrics(data || []))
      .catch((err) => setError(err.message || "Unknown error"))
      .finally(() => setLoadingMetrics(false));
  }, [selectedApi, BACKEND]);

  return (
    <div style={{ padding: 20 }}>
      <div style={{ marginBottom: 12 }}>
        <label style={{ marginRight: 8 }}>Select API:</label>
        {loadingApis ? (
          <span>Loading APIs...</span>
        ) : apis.length === 0 ? (
          <span>No APIs registered</span>
        ) : (
          <select
            value={selectedApi}
            onChange={(e) => setSelectedApi(e.target.value)}
          >
            {apis.map((a) => (
              <option key={a.api_id} value={a.api_id}>
                {a.name} ({a.api_id})
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div style={{ color: "red", marginBottom: 12 }}>Error: {error}</div>
      )}

      <section>
        <h3>Recent Metrics (latest first)</h3>
        {loadingMetrics ? (
          <div>Loading metrics...</div>
        ) : (
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
              {metrics.length === 0 && (
                <tr>
                  <td colSpan="4">No metrics yet</td>
                </tr>
              )}
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
        )}
      </section>
    </div>
  );
}
