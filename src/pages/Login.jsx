import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login, error } = useAuth();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const onSubmit = async (e) => { e.preventDefault(); setBusy(true); await login(pw); setBusy(false); };
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-panel border border-border rounded-xl p-6 space-y-4">
        <h1 className="text-xl font-semibold">📓 IWP Work Tracker</h1>
        <p className="text-sm text-muted">Enter your app password.</p>
        <input type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)}
          className="w-full rounded-md border border-border bg-bg px-3 py-2 outline-none focus:ring-2 focus:ring-accent" placeholder="Password" />
        {error && <div className="text-sm text-red-500">{error}</div>}
        <button disabled={busy} className="w-full rounded-md bg-accent text-white py-2 font-medium hover:opacity-90 disabled:opacity-50">
          {busy ? "Checking…" : "Unlock"}
        </button>
        <div className="text-xs text-muted text-center">
          First time? Use the APP_PASSWORD from your .env file.
        </div>
      </form>
    </div>
  );
}
