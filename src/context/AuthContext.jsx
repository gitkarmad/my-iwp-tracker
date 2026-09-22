import { createContext, useContext, useState } from 'react';
const Ctx = createContext(null);
const KEY = 'iwp.password';
export function AuthProvider({ children }) {
  const [password, setPassword] = useState(() => localStorage.getItem(KEY) || '');
  const [error, setError] = useState('');
  const login = async (pw) => {
    setError('');
    try {
      const r = await fetch('/api?action=stats.recent&limit=1', { headers: { 'x-app-password': pw } });
      if (r.status === 401) { setError('Wrong password'); return false; }
      if (!r.ok) { setError("Server error: " + r.status); return false; }
      localStorage.setItem(KEY, pw);
      setPassword(pw);
      return true;
    } catch (e) { setError("Network error: " + e.message); return false; }
  };
  const logout = () => { localStorage.removeItem(KEY); setPassword(''); };
  return <Ctx.Provider value={{ password, login, logout, error }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
