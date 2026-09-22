import { useEffect, useState } from 'react';
import { useApi } from '../api/client.js';
import CategoryPie from '../components/charts/CategoryPie.jsx';
import MonthlyBar from '../components/charts/MonthlyBar.jsx';
import EntryCard from '../components/EntryCard.jsx';
import EntryForm from '../components/EntryForm.jsx';

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-border bg-panel p-4">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const api = useApi();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setError("");
      const [s, r] = await Promise.all([api.statsSummary(), api.statsRecent(5)]);
      setStats(s); setRecent(r);
    } catch (e) { setError(e.message); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    const h = () => load();
    window.addEventListener("entries:changed", h);
    return () => window.removeEventListener("entries:changed", h);
  }, []);

  if (error) return <div className="p-8 text-red-500">Error loading dashboard: {error}</div>;
  if (!stats) return <div className="p-8 text-muted">Loading…</div>;

  const today = new Date().toISOString().slice(0, 10);
  const hasToday = recent.some((e) => e.date === today) || stats.todayEntries > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted">Your {stats.year} at a glance.</p>
      </div>
      {!hasToday && (
        <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 px-4 py-3 text-sm">
          You haven't logged anything today yet. Tap the ＋ Log Work button.
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="This year" value={stats.yearEntries} />
        <Stat label="This month" value={stats.monthEntries} />
        <Stat label="This week" value={stats.weekEntries} />
        <Stat label="Streak (days)" value={stats.streak} />
        <Stat label="Hours this year" value={stats.yearHours.toFixed(1)} />
        <Stat label="Hours this month" value={stats.monthHours.toFixed(1)} />
        <Stat label="Hours this week" value={stats.weekHours.toFixed(1)} />
        <Stat label="Today" value={stats.todayEntries} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-panel p-4">
          <h2 className="font-medium mb-2">Category breakdown</h2>
          {stats.categories.length ? <CategoryPie data={stats.categories} /> : <div className="text-muted text-sm">No data yet.</div>}
        </div>
        <div className="rounded-lg border border-border bg-panel p-4">
          <h2 className="font-medium mb-2">Monthly activity</h2>
          {stats.monthly.length ? <MonthlyBar data={stats.monthly} /> : <div className="text-muted text-sm">No data yet.</div>}
        </div>
      </div>
      <div>
        <h2 className="font-medium mb-3">Recent entries</h2>
        <div className="space-y-3">
          {recent.map((e) => <EntryCard key={e.id} entry={e} onChanged={load} onEdit={setEditing} />)}
          {!recent.length && <div className="text-muted text-sm">No entries yet.</div>}
        </div>
      </div>
      {editing && <EntryForm entry={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}
