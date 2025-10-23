import React, { useState, useEffect } from "react";
import { listRules, createRule, deleteRule } from "../services/api";

export default function RuleManager({ api_id }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    rule_id: "",
    name: "",
    type: "latency_gt",
    threshold: 1000,
  });
  const [error, setError] = useState(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const data = await listRules(api_id);
      setRules(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (api_id) reload();
    else setRules([]);
  }, [api_id]);

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    const payload = {
      rule_id: form.rule_id.trim(),
      name: form.name.trim(),
      api_id,
      type: form.type,
      threshold: Number(form.threshold),
    };
    try {
      await createRule(payload);
      setForm({ rule_id: "", name: "", type: "latency_gt", threshold: 1000 });
      await reload();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDelete(rule_id) {
    if (!window.confirm(`Delete rule ${rule_id}?`)) return;
    try {
      await deleteRule(rule_id);
      await reload();
    } catch (e) {
      setError(e.message);
    }
  }

  if (!api_id) return <div>Select an API to manage rules</div>;

  return (
    <div>
      <h3>Rules</h3>
      {error && <div style={{ color: "red" }}>{error}</div>}
      <form onSubmit={handleCreate} style={{ marginBottom: 12 }}>
        <input
          placeholder="rule_id"
          value={form.rule_id}
          onChange={(e) => setForm({ ...form, rule_id: e.target.value })}
          required
        />
        <input
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        >
          <option value="latency_gt">Latency &gt; (ms)</option>
          <option value="status_not">Status not in</option>
        </select>
        <input
          placeholder="threshold"
          value={form.threshold}
          onChange={(e) => setForm({ ...form, threshold: e.target.value })}
          style={{ width: 100 }}
          required
        />
        <button type="submit">Add Rule</button>
      </form>

      <div>
        {loading ? (
          <div>Loading rules...</div>
        ) : (
          <ul style={{ paddingLeft: 0 }}>
            {rules.map((r) => (
              <li
                key={r.rule_id}
                style={{ listStyle: "none", marginBottom: 6 }}
              >
                <strong>{r.name}</strong> ({r.rule_id}) — {r.type} {r.threshold}
                <button
                  onClick={() => handleDelete(r.rule_id)}
                  style={{ marginLeft: 8 }}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
