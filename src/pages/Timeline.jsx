import { useEffect, useMemo, useState } from 'react';
import { useApi } from '../api/client.js';
import EntryCard from '../components/EntryCard.jsx';
import EntryForm from '../components/EntryForm.jsx';
import Filters from '../components/Filters.jsx';

export default function Timeline() {
  const api = useApi();
  const [entries, setEntries] = useState([]);
  const [categories, setCategories] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filters, setFilters] = useState({ from: "", to: "", category: "", project: "", status: "", highlight: "" });
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);

  const load = () => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    if (q) params.q = q;
    api.listEntries(params).then(setEntries).catch(() => {});
  };
  useEffect(() => { load(); }, [filters, q]);
  useEffect(() => {
    api.listCategories().then(setCategories).catch(() => {});
    api.projectNames().then(setProjects).catch(() => {});
    const h = () => load();
    window.addEventListener("entries:changed", h);
    return () => window.removeEventListener("entries:changed", h);
  }, []);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const e of entries) {
      const m = e.date.slice(0, 7);
      if (!map.has(m)) map.set(m, []);
      map.get(m).push(e);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [entries]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Timeline</h1>
        <div className="text-sm text-muted">{entries.length} entries</div>
      </div>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, description, project…"
        className="w-full rounded-md border border-border bg-panel px-3 py-2 outline-none focus:ring-2 focus:ring-accent" />
      <Filters value={filters} onChange={setFilters} categories={categories} projects={projects} />
      <div className="space-y-8 pt-2">
        {grouped.map(([month, list]) => (
          <section key={month}>
            <h2 className="text-sm uppercase tracking-wide text-muted mb-2">{month}</h2>
            <div className="space-y-3">
              {list.map((e) => <EntryCard key={e.id} entry={e} onChanged={load} onEdit={setEditing} />)}
            </div>
          </section>
        ))}
        {!grouped.length && <div className="text-muted text-sm">No entries match your filters.</div>}
      </div>
      {editing && <EntryForm entry={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}
