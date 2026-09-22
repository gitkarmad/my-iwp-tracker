import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useApi } from '../api/client.js';

const STATUSES = ["Completed", "In Progress", "Blocked"];

export default function EntryForm({ entry, onClose, onSaved }) {
  const api = useApi();
  const [categories, setCategories] = useState([]);
  const [projectNames, setProjectNames] = useState([]);
  const [form, setForm] = useState(() => entry || {
    date: new Date().toISOString().slice(0, 10),
    title: "", description: "", category: "Development", project: "",
    hours: "", status: "Completed", isHighlight: false, links: [],
  });
  const [linkInput, setLinkInput] = useState("");
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const titleRef = useRef(null);

  useEffect(() => {
    api.listCategories().then(setCategories).catch(() => {});
    api.projectNames().then(setProjectNames).catch(() => {});
    if (!entry) {
      api.getDraft().then(({ payload }) => {
        if (payload && (payload.title || payload.description)) {
          setForm((f) => ({ ...f, ...payload, date: new Date().toISOString().slice(0, 10) }));
        }
      }).catch(() => {});
    }
    setTimeout(() => { if (titleRef.current) titleRef.current.focus(); }, 50);
  }, []);

  useEffect(() => {
    if (entry) return;
    const t = setTimeout(() => { api.saveDraft(form).catch(() => {}); }, 800);
    return () => clearTimeout(t);
  }, [form]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setSaving(true); setError("");
    try {
      const payload = { ...form, hours: Number(form.hours) || 0, links: form.links || [] };
      if (entry && entry.id) await api.updateEntry(entry.id, payload);
      else { await api.createEntry(payload); await api.clearDraft().catch(() => {}); }
      if (onSaved) onSaved();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const onKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); submit(); }
    if (e.key === "Escape" && !saving && onClose) onClose();
  };

  const addLink = () => {
    if (!linkInput.trim()) return;
    set("links", [...(form.links || []), linkInput.trim()]);
    setLinkInput("");
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-start justify-center p-4 overflow-y-auto" onKeyDown={onKeyDown}>
      <div className="w-full max-w-2xl bg-panel border border-border rounded-xl shadow-xl my-8">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-semibold">{entry ? "Edit Entry" : "Log Work"}</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => set("isHighlight", !form.isHighlight)} title="Mark as highlight"
              className={"text-lg " + (form.isHighlight ? "text-yellow-500" : "text-muted")}>
              {form.isHighlight ? "★" : "☆"}
            </button>
            <button onClick={onClose} className="text-muted hover:text-text text-xl leading-none">×</button>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm"><div className="text-muted mb-1">Date</div>
              <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 outline-none focus:ring-2 focus:ring-accent" /></label>
            <label className="text-sm"><div className="text-muted mb-1">Status</div>
              <select value={form.status} onChange={(e) => set("status", e.target.value)}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 outline-none focus:ring-2 focus:ring-accent">
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select></label>
          </div>
          <label className="block text-sm"><div className="text-muted mb-1">Title</div>
            <input ref={titleRef} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="What did you do?"
              className="w-full rounded-md border border-border bg-bg px-3 py-2 outline-none focus:ring-2 focus:ring-accent" /></label>
          <div className="text-sm">
            <div className="flex items-center justify-between mb-1">
              <div className="text-muted">Description (Markdown)</div>
              <button onClick={() => setPreview((p) => !p)} className="text-xs text-accent">{preview ? "Edit" : "Preview"}</button>
            </div>
            {preview ? (
              <div className="md min-h-[100px] rounded-md border border-border bg-bg px-3 py-2">
                <ReactMarkdown>{form.description || "_No description_"}</ReactMarkdown>
              </div>
            ) : (
              <textarea rows={6} value={form.description} onChange={(e) => set("description", e.target.value)}
                placeholder="Details, links, decisions, blockers…"
                className="w-full rounded-md border border-border bg-bg px-3 py-2 outline-none focus:ring-2 focus:ring-accent font-mono text-sm" />
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="text-sm"><div className="text-muted mb-1">Category</div>
              <select value={form.category} onChange={(e) => set("category", e.target.value)}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 outline-none focus:ring-2 focus:ring-accent">
                {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select></label>
            <label className="text-sm sm:col-span-2"><div className="text-muted mb-1">Project / Tag</div>
              <input list="project-names" value={form.project} onChange={(e) => set("project", e.target.value)} placeholder="e.g. IWP Tracker"
                className="w-full rounded-md border border-border bg-bg px-3 py-2 outline-none focus:ring-2 focus:ring-accent" />
              <datalist id="project-names">{projectNames.map((p) => <option key={p.name} value={p.name} />)}</datalist></label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm"><div className="text-muted mb-1">Hours</div>
              <input type="number" step="0.25" min="0" value={form.hours} onChange={(e) => set("hours", e.target.value)} placeholder="0"
                className="w-full rounded-md border border-border bg-bg px-3 py-2 outline-none focus:ring-2 focus:ring-accent" /></label>
          </div>
          <div className="text-sm">
            <div className="text-muted mb-1">Links</div>
            <div className="flex gap-2">
              <input value={linkInput} onChange={(e) => setLinkInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }} placeholder="https://…"
                className="flex-1 rounded-md border border-border bg-bg px-3 py-2 outline-none focus:ring-2 focus:ring-accent" />
              <button onClick={addLink} type="button" className="rounded-md border border-border px-3">Add</button>
            </div>
            {(form.links || []).length > 0 && (
              <ul className="mt-2 space-y-1">
                {form.links.map((l, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs">
                    <a className="text-accent underline truncate flex-1" href={l} target="_blank" rel="noreferrer">{l}</a>
                    <button onClick={() => set("links", form.links.filter((_, j) => j !== i))} className="text-muted hover:text-red-500">×</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {error && <div className="text-sm text-red-500">Error: {error}</div>}
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <div className="text-xs text-muted">Ctrl/⌘ + Enter to save</div>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-md border border-border px-4 py-2 text-sm">Cancel</button>
            <button onClick={submit} disabled={saving}
              className="rounded-md bg-accent text-white px-4 py-2 text-sm font-medium disabled:opacity-50">
              {saving ? "Saving…" : entry ? "Update" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
