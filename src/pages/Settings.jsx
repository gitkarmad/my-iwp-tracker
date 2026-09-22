import { useEffect, useState } from 'react';
import { useApi } from '../api/client.js';
import { useTheme } from '../context/ThemeContext.jsx';

export default function Settings() {
  const api = useApi();
  const { theme, toggle } = useTheme();
  const [categories, setCategories] = useState([]);
  const [newCat, setNewCat] = useState("");
  const [importJson, setImportJson] = useState("");
  const [importCsv, setImportCsv] = useState("");
  const [msg, setMsg] = useState("");

  const load = () => api.listCategories().then(setCategories).catch(() => {});
  useEffect(() => { load(); }, []);

  const addCat = async () => {
    if (!newCat.trim()) return;
    await api.createCategory({ name: newCat.trim() });
    setNewCat(""); load();
  };
  const delCat = async (id) => { if (confirm("Delete category?")) { await api.deleteCategory(id); load(); } };

  const doBackup = async () => {
    const data = await api.call ? null : null;
    // fetch raw backup
    const pw = localStorage.getItem("iwp.password") || "";
    const r = await fetch("/api?action=data.backup", { headers: { "x-app-password": pw } });
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "iwp-backup-" + Date.now() + ".json"; a.click();
    URL.revokeObjectURL(url);
  };

  const doRestore = async () => {
    try {
      const data = JSON.parse(importJson);
      const res = await api.restore({ ...data, mode: "merge" });
      setMsg("Restored. Total entries: " + res.entries);
      setImportJson("");
    } catch (e) { setMsg("Error: " + e.message); }
  };

  const doCsv = async () => {
    try {
      const res = await api.importCsv(importCsv);
      setMsg("Imported " + res.inserted + " entries.");
      setImportCsv("");
    } catch (e) { setMsg("Error: " + e.message); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <section className="rounded-lg border border-border bg-panel p-4">
        <h2 className="font-medium mb-2">Appearance</h2>
        <button onClick={toggle} className="rounded-md border border-border px-3 py-2 text-sm">
          {theme === "dark" ? "☀️  Switch to light" : "🌙  Switch to dark"}
        </button>
      </section>
      <section className="rounded-lg border border-border bg-panel p-4">
        <h2 className="font-medium mb-2">Categories</h2>
        <div className="flex gap-2 mb-3">
          <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="New category name"
            className="flex-1 rounded-md border border-border bg-bg px-3 py-2 text-sm" />
          <button onClick={addCat} className="rounded-md border border-border px-3 py-2 text-sm">Add</button>
        </div>
        <ul className="space-y-1 text-sm">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center justify-between border border-border rounded-md px-3 py-2">
              <span>{c.name}</span>
              <button onClick={() => delCat(c.id)} className="text-muted hover:text-red-500">Delete</button>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-lg border border-border bg-panel p-4 space-y-3">
        <h2 className="font-medium">Data</h2>
        <button onClick={doBackup} className="rounded-md border border-border px-3 py-2 text-sm">Download JSON backup</button>
        <details>
          <summary className="cursor-pointer text-sm">Restore from JSON</summary>
          <textarea rows={5} value={importJson} onChange={(e) => setImportJson(e.target.value)}
            placeholder="Paste backup JSON here"
            className="mt-2 w-full rounded-md border border-border bg-bg px-3 py-2 text-xs font-mono" />
          <button onClick={doRestore} className="mt-2 rounded-md bg-accent text-white px-3 py-2 text-sm">Restore (merge)</button>
        </details>
        <details>
          <summary className="cursor-pointer text-sm">Import from CSV</summary>
          <div className="text-xs text-muted mt-1">Header: <code>date,title,description,category,project,hours,status,isHighlight,links</code></div>
          <textarea rows={5} value={importCsv} onChange={(e) => setImportCsv(e.target.value)}
            placeholder="date,title,..."
            className="mt-2 w-full rounded-md border border-border bg-bg px-3 py-2 text-xs font-mono" />
          <button onClick={doCsv} className="mt-2 rounded-md bg-accent text-white px-3 py-2 text-sm">Import CSV</button>
        </details>
      </section>
      {msg && <div className="text-sm text-muted">{msg}</div>}
    </div>
  );
}
