export default function Filters({ value, onChange, categories, projects }) {
  const set = (k, v) => onChange({ ...value, [k]: v });
  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-sm">
      <input type="date" value={value.from || ""} onChange={(e) => set("from", e.target.value)}
        className="rounded-md border border-border bg-panel px-3 py-2 col-span-2 md:col-span-1" placeholder="From" />
      <input type="date" value={value.to || ""} onChange={(e) => set("to", e.target.value)}
        className="rounded-md border border-border bg-panel px-3 py-2 col-span-2 md:col-span-1" placeholder="To" />
      <select value={value.category || ""} onChange={(e) => set("category", e.target.value)}
        className="rounded-md border border-border bg-panel px-3 py-2">
        <option value="">All categories</option>
        {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
      </select>
      <select value={value.project || ""} onChange={(e) => set("project", e.target.value)}
        className="rounded-md border border-border bg-panel px-3 py-2">
        <option value="">All projects</option>
        {projects.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
      </select>
      <select value={value.status || ""} onChange={(e) => set("status", e.target.value)}
        className="rounded-md border border-border bg-panel px-3 py-2">
        <option value="">All statuses</option>
        <option>Completed</option><option>In Progress</option><option>Blocked</option>
      </select>
      <label className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-panel">
        <input type="checkbox" checked={value.highlight === "true"} onChange={(e) => set("highlight", e.target.checked ? "true" : "")} />
        ★ Only
      </label>
    </div>
  );
}
