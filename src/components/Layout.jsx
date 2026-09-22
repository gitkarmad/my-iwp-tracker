import { NavLink, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useState } from 'react';
import EntryForm from './EntryForm.jsx';

const nav = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/timeline",  label: "Timeline" },
  { to: "/projects",  label: "Projects" },
  { to: "/report",    label: "Report" },
  { to: "/settings",  label: "Settings" },
];

export default function Layout({ children }) {
  const { theme, toggle } = useTheme();
  const { logout } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const nav2 = useNavigate();
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="md:w-56 md:min-h-screen border-b md:border-b-0 md:border-r border-border bg-panel">
        <div className="p-4 flex md:block items-center justify-between">
          <div className="font-semibold">📓 IWP Tracker</div>
          <div className="flex md:hidden gap-2">
            <button onClick={toggle} className="text-sm px-2 py-1 rounded border border-border">{theme === "dark" ? "☀️" : "🌙"}</button>
          </div>
        </div>
        <nav className="px-2 pb-3 flex md:flex-col gap-1 overflow-x-auto">
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to}
              className={({ isActive }) => "px-3 py-2 rounded-md text-sm whitespace-nowrap " + (isActive ? "bg-accent/10 text-accent font-medium" : "hover:bg-border/50 text-muted")}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden md:flex flex-col gap-2 px-4 py-3 border-t border-border">
          <button onClick={toggle} className="text-sm text-left text-muted hover:text-text">
            {theme === "dark" ? "☀️  Light mode" : "🌙  Dark mode"}
          </button>
          <button onClick={() => { logout(); nav2("/"); }} className="text-sm text-left text-muted hover:text-text">🚪  Lock</button>
        </div>
      </aside>
      <main className="flex-1 relative">
        <div className="max-w-4xl mx-auto p-4 md:p-8 pb-28">{children}</div>
        <button onClick={() => setShowForm(true)}
          className="fixed bottom-6 right-6 z-30 rounded-full bg-accent text-white px-5 py-3 font-medium shadow-lg hover:opacity-90">
          ＋ Log Work
        </button>
        {showForm && (
          <EntryForm onClose={() => setShowForm(false)}
            onSaved={() => { setShowForm(false); window.dispatchEvent(new Event("entries:changed")); }} />
        )}
      </main>
    </div>
  );
}
