import React, { useEffect, useState } from "react";
import { listApis, getMetrics, listAlerts } from "../services/api";
import ApiSelector from "./ApiSelector";
import MetricsTable from "./MetricsTable";
import AlertsList from "./AlertsList";
import LatencySparkline from "./LatencySparkline";
import ApiManager from "./ApiManager";
import RuleManager from "./RuleManager";

export default function Dashboard() {
  const [apis, setApis] = useState([]);
  const [selectedApi, setSelectedApi] = useState("");
  const [metrics, setMetrics] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loadingApis, setLoadingApis] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [error, setError] = useState(null);

  async function reloadApis() {
    setLoadingApis(true);
    try {
      const data = await listApis();
      setApis(data || []);
      if (data && data.length && !selectedApi) setSelectedApi(data[0].api_id);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingApis(false);
    }
  }

  useEffect(() => {
    reloadApis();
  }, []);

  useEffect(() => {
    if (!selectedApi) {
      setMetrics([]);
      setAlerts([]);
      return;
    }
    setLoadingMetrics(true);
    getMetrics(selectedApi, 30)
      .then((m) => setMetrics(m || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoadingMetrics(false));

    setLoadingAlerts(true);
    listAlerts({ api_id: selectedApi, limit: 20 })
      .then((a) => setAlerts(a || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoadingAlerts(false));
  }, [selectedApi]);

  return (
    <div style={{ padding: 20 }}>
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div style={{ flex: 1 }}>
          <ApiSelector
            apis={apis}
            selectedApi={selectedApi}
            onChange={setSelectedApi}
            loading={loadingApis}
          />
        </div>
        <div>
          <button onClick={reloadApis}>Reload APIs</button>
        </div>
      </div>

      {error && <div style={{ color: "red", marginBottom: 12 }}>{error}</div>}

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16 }}
      >
        <div>
          <section style={{ marginBottom: 16 }}>
            <h3>Recent Metrics</h3>
            <LatencySparkline metrics={metrics.slice(0, 20).reverse()} />
            <MetricsTable metrics={metrics} loading={loadingMetrics} />
          </section>

          <section>
            <h3>Manage APIs</h3>
            <ApiManager onSelect={setSelectedApi} />
          </section>
        </div>

        <aside>
          <section style={{ marginBottom: 16 }}>
            <h3>Rules (for selected API)</h3>
            <RuleManager api_id={selectedApi} />
          </section>

          <section>
            <AlertsList alerts={alerts} loading={loadingAlerts} />
          </section>
        </aside>
      </div>
    </div>
  );
}
