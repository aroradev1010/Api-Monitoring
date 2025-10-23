import React, { useState, useEffect } from "react";
import { listApis, createApi, deleteApi } from "../services/api";

export default function ApiManager({ onSelect }) {
  const [apis, setApis] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    api_id: "",
    name: "",
    base_url: "",
    probe_interval: 30,
    expected_status: "200",
  });
  const [error, setError] = useState(null);

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const data = await listApis();
      setApis(data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    const payload = {
      api_id: form.api_id.trim(),
      name: form.name.trim(),
      base_url: form.base_url.trim(),
      probe_interval: Number(form.probe_interval) || 30,
      expected_status: form.expected_status
        .split(",")
        .map((s) => Number(s.trim())),
    };
    try {
      await createApi(payload);
      setForm({
        api_id: "",
        name: "",
        base_url: "",
        probe_interval: 30,
        expected_status: "200",
      });
      await reload();
      if (onSelect) onSelect(payload.api_id);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDelete(api_id) {
    if (!window.confirm(`Delete API ${api_id}?`)) return;
    try {
      await deleteApi(api_id);
      await reload();
      if (onSelect) onSelect("");
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <h3>APIs</h3>
      {error && <div style={{ color: "red" }}>{error}</div>}
      <div>
        <form onSubmit={handleCreate} style={{ marginBottom: 12 }}>
          <input
            placeholder="api_id (alphanumeric)"
            value={form.api_id}
            onChange={(e) => setForm({ ...form, api_id: e.target.value })}
            required
          />
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            placeholder="Base URL"
            value={form.base_url}
            onChange={(e) => setForm({ ...form, base_url: e.target.value })}
            required
          />
          <input
            placeholder="Interval (s)"
            value={form.probe_interval}
            onChange={(e) =>
              setForm({ ...form, probe_interval: e.target.value })
            }
            style={{ width: 100 }}
          />
          <input
            placeholder="Expected status (comma)"
            value={form.expected_status}
            onChange={(e) =>
              setForm({ ...form, expected_status: e.target.value })
            }
            style={{ width: 140 }}
          />
          <button type="submit">Add API</button>
        </form>
      </div>

      <div>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <ul style={{ paddingLeft: 0 }}>
            {apis.map((a) => (
              <li key={a.api_id} style={{ listStyle: "none", marginBottom: 6 }}>
                <strong>{a.name}</strong> ({a.api_id}) — {a.base_url}
                <button
                  onClick={() => onSelect && onSelect(a.api_id)}
                  style={{ marginLeft: 8 }}
                >
                  Select
                </button>
                <button
                  onClick={() => handleDelete(a.api_id)}
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
