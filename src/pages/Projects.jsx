import { useEffect, useState } from 'react';
import { useApi } from '../api/client.js';
import EntryCard from '../components/EntryCard.jsx';
import EntryForm from '../components/EntryForm.jsx';

export default function Projects() {
  const api = useApi();
  const [projects, setProjects] = useState([]);
  const [open, setOpen] = useState(null);
  const [entries, setEntries] = useState([]);
  const [editing, setEditing] = useState(null);

  useEffect(() => { api.listProjects().then(setProjects).catch(() => {}); }, []);

  const loadEntries = async (name) => {
    setOpen(name);
    setEntries(await api.listEntries({ project: name }));
  };
  const refresh = () => { api.listProjects().then(setProjects).catch(() => {}); if (open) loadEntries(open); };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Projects</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {projects.map((p) => (
          <button key={p.project} onClick={() => loadEntries(p.project)}
            className={"text-left rounded-lg border bg-panel p-4 hover:shadow-sm transition " + (open === p.project ? "border-accent" : "border-border")}>
            <div className="font-medium truncate">{p.project}</div>
            <div className="text-xs text-muted mt-1">
              {p.entries} entries · {Number(p.hours).toFixed(1)}h · {p.highlights} ★
            </div>
            <div className="text-xs text-muted mt-1">{p.first_date} → {p.last_date}</div>
          </button>
        ))}
        {!projects.length && <div className="text-muted text-sm">No projects yet — add a project name to an entry.</div>}
      </div>
      {open && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Entries in "{open}"</h2>
            <button onClick={() => setOpen(null)} className="text-xs text-muted hover:text-text">Close</button>
          </div>
          {entries.map((e) => <EntryCard key={e.id} entry={e} onChanged={refresh} onEdit={setEditing} />)}
        </div>
      )}
      {editing && <EntryForm entry={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}
    </div>
  );
}
