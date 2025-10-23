
export default function ApiSelector({ apis, selectedApi, onChange, loading }) {
  if (loading) return <div>Loading APIs...</div>;
  if (!apis || apis.length === 0) return <div>No APIs registered</div>;

  return (
    <select value={selectedApi} onChange={(e) => onChange(e.target.value)}>
      {apis.map((a) => (
        <option key={a.api_id} value={a.api_id}>
          {a.name} ({a.api_id})
        </option>
      ))}
    </select>
  );
}
