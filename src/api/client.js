import { useAuth } from '../context/AuthContext.jsx';

export function useApi() {
  const { password } = useAuth();
  const headers = { 'Content-Type': 'application/json', 'x-app-password': password || '' };

  const call = async (action, params = {}, body) => {
    const qs = new URLSearchParams({ action, ...params }).toString();
    const r = await fetch("/api?" + qs, {
      method: body ? "POST" : (action.includes("delete") || action.includes("star") || action.includes("update") || action.includes("save") || action.includes("clear") || action.includes("restore") || action.includes("import") || action.includes("duplicate") || action.includes("create") ? "POST" : "GET"),
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.error || ("HTTP " + r.status));
    }
    return r.json();
  };

  return {
    listEntries: (params = {}) => call("entries.list", params),
    createEntry: (b) => call("entries.create", {}, b),
    updateEntry: (id, b) => call("entries.update", { id }, b),
    deleteEntry: (id) => call("entries.delete", { id }),
    duplicate:   (id, b = {}) => call("entries.duplicate", { id }, b),
    toggleStar:  (id) => call("entries.star", { id }),
    getDraft:    () => call("draft.get"),
    saveDraft:   (b) => call("draft.save", {}, b),
    clearDraft:  () => call("draft.clear"),
    listCategories: () => call("categories.list"),
    createCategory: (b) => call("categories.create", {}, b),
    updateCategory: (id, b) => call("categories.update", { id }, b),
    deleteCategory: (id) => call("categories.delete", { id }),
    listProjects: () => call("projects.list"),
    projectNames: () => call("projects.names"),
    statsSummary: (year) => call("stats.summary", { year: year || new Date().getFullYear() }),
    statsRecent: (limit = 5) => call("stats.recent", { limit }),
    restore: (b) => call("data.restore", {}, b),
    importCsv: (csv) => call("data.import-csv", {}, { csv }),
  };
}
