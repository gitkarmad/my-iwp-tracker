import { createClient } from '@supabase/supabase-js';

// ─── Supabase client (initialized once per cold start) ───
let supabase = null;
function getSupabase() {
  if (supabase) return supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  supabase = createClient(url, key, { auth: { persistSession: false } });
  return supabase;
}

// ─── Helpers ───
const rowToEntry = (r) => r ? {
  id: r.id, date: r.date, title: r.title, description: r.description || "",
  category: r.category || "Other", project: r.project || "",
  hours: Number(r.hours) || 0, status: r.status || "Completed",
  isHighlight: !!r.is_highlight, links: Array.isArray(r.links) ? r.links : [],
  createdAt: r.created_at, updatedAt: r.updated_at,
} : null;

const bodyToRow = (b = {}) => ({
  date: b.date || new Date().toISOString().slice(0, 10),
  title: String(b.title || "").trim() || "Untitled",
  description: String(b.description || ""),
  category: b.category || "Other",
  project: String(b.project || "").trim(),
  hours: Number(b.hours) || 0,
  status: b.status || "Completed",
  is_highlight: !!b.isHighlight,
  links: Array.isArray(b.links) ? b.links.filter(Boolean) : [],
});

// ─── Auth ───
function checkAuth(req, res) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return true; // no password set → open
  const provided = req.headers["x-app-password"] || "";
  if (provided !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

// ═══════════════════════════════════════════════════════════
// MAIN HANDLER — every /api/* request lands here
// ═══════════════════════════════════════════════════════════

export default async function handler(req, res) {
  try {
    // Handle CORS preflight
    if (req.method === "OPTIONS") return res.status(200).end();

    // Parse the action from query string
    const action = req.query.action || "";

    // Health check — no auth required
    if (action === "ping") {
      return res.json({ ok: true, time: new Date().toISOString() });
    }

    // Debug — no auth required, shows env var presence
    if (action === "debug") {
      return res.json({
        hasUrl: !!process.env.SUPABASE_URL,
        hasKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasPassword: !!process.env.APP_PASSWORD,
        urlHost: (process.env.SUPABASE_URL || "").replace(/^https?:\/\//, ""),
      });
    }

    // Everything else requires auth
    if (!checkAuth(req, res)) return;

    const sb = getSupabase();

    // ── ENTRIES ──────────────────────────────────────────
    if (action === "entries.list") {
      let q = sb.from("entries").select("*")
        .order("date", { ascending: false })
        .order("id", { ascending: false });
      const f = req.query;
      if (f.from)     q = q.gte("date", f.from);
      if (f.to)       q = q.lte("date", f.to);
      if (f.category) q = q.eq("category", f.category);
      if (f.project)  q = q.eq("project", f.project);
      if (f.status)   q = q.eq("status", f.status);
      if (f.highlight === "true") q = q.eq("is_highlight", true);
      if (f.q) q = q.or(`title.ilike.%${f.q}%,description.ilike.%${f.q}%,project.ilike.%${f.q}%`);
      if (f.limit) q = q.range(Number(f.offset) || 0, (Number(f.offset) || 0) + Number(f.limit) - 1);
      const { data, error } = await q;
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data.map(rowToEntry));
    }

    if (action === "entries.create") {
      const row = bodyToRow(req.body);
      const { data, error } = await sb.from("entries").insert(row).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json(rowToEntry(data));
    }

    if (action === "entries.get") {
      const { data, error } = await sb.from("entries").select("*").eq("id", req.query.id).single();
      if (error) return res.status(404).json({ error: "Not found" });
      return res.json(rowToEntry(data));
    }

    if (action === "entries.update") {
      const row = bodyToRow(req.body);
      const { data, error } = await sb.from("entries").update(row).eq("id", req.query.id).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json(rowToEntry(data));
    }

    if (action === "entries.delete") {
      const { error } = await sb.from("entries").delete().eq("id", req.query.id);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ ok: true });
    }

    if (action === "entries.star") {
      const { data: cur, error: e1 } = await sb.from("entries").select("is_highlight").eq("id", req.query.id).single();
      if (e1) return res.status(404).json({ error: "Not found" });
      const next = !cur.is_highlight;
      const { error } = await sb.from("entries").update({ is_highlight: next }).eq("id", req.query.id);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ isHighlight: next });
    }

    if (action === "entries.duplicate") {
      const { data: src, error: e1 } = await sb.from("entries").select("*").eq("id", req.query.id).single();
      if (e1) return res.status(404).json({ error: "Not found" });
      const { id: _d, created_at, updated_at, ...rest } = src;
      const next = { ...rest, date: (req.body && req.body.date) || new Date().toISOString().slice(0, 10), is_highlight: false };
      const { data, error } = await sb.from("entries").insert(next).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.status(201).json(rowToEntry(data));
    }

    // ── DRAFT ────────────────────────────────────────────
    if (action === "draft.get") {
      const { data } = await sb.from("drafts").select("*").eq("id", 1).maybeSingle();
      return res.json(data ? { payload: data.payload, updatedAt: data.updated_at } : { payload: null });
    }
    if (action === "draft.save") {
      const { error } = await sb.from("drafts").upsert({ id: 1, payload: req.body || {}, updated_at: new Date().toISOString() });
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ ok: true });
    }
    if (action === "draft.clear") {
      await sb.from("drafts").delete().eq("id", 1);
      return res.json({ ok: true });
    }

    // ── CATEGORIES ───────────────────────────────────────
    if (action === "categories.list") {
      const { data, error } = await sb.from("categories").select("*").order("sort").order("name");
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }
    if (action === "categories.create") {
      const { name, color = "#64748b" } = req.body || {};
      if (!name) return res.status(400).json({ error: "name required" });
      const { data: maxRow } = await sb.from("categories").select("sort").order("sort", { ascending: false }).limit(1).maybeSingle();
      const sort = ((maxRow && maxRow.sort) || 0) + 1;
      const { data, error } = await sb.from("categories").insert({ name: name.trim(), color, sort }).select().single();
      if (error) return res.status(400).json({ error: error.message });
      return res.status(201).json(data);
    }
    if (action === "categories.update") {
      const patch = {};
      if (req.body && req.body.name) patch.name = req.body.name;
      if (req.body && req.body.color) patch.color = req.body.color;
      const { data, error } = await sb.from("categories").update(patch).eq("id", req.query.id).select().single();
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data);
    }
    if (action === "categories.delete") {
      const { error } = await sb.from("categories").delete().eq("id", req.query.id);
      if (error) return res.status(500).json({ error: error.message });
      return res.json({ ok: true });
    }

    // ── PROJECTS ─────────────────────────────────────────
    if (action === "projects.list") {
      const { data, error } = await sb.from("entries").select("project, hours, date, is_highlight").neq("project", "");
      if (error) return res.status(500).json({ error: error.message });
      const map = new Map();
      for (const r of data) {
        if (!map.has(r.project)) map.set(r.project, { project: r.project, entries: 0, hours: 0, first_date: r.date, last_date: r.date, highlights: 0 });
        const a = map.get(r.project);
        a.entries++; a.hours += Number(r.hours) || 0;
        if (r.date < a.first_date) a.first_date = r.date;
        if (r.date > a.last_date) a.last_date = r.date;
        if (r.is_highlight) a.highlights++;
      }
      return res.json([...map.values()].sort((a, b) => b.last_date.localeCompare(a.last_date)));
    }
    if (action === "projects.names") {
      const { data, error } = await sb.from("entries").select("project").neq("project", "");
      if (error) return res.status(500).json({ error: error.message });
      const counts = new Map();
      for (const r of data) counts.set(r.project, (counts.get(r.project) || 0) + 1);
      return res.json([...counts.entries()].map(([name, uses]) => ({ name, uses })).sort((a, b) => b.uses - a.uses).slice(0, 200));
    }

    // ── STATS ────────────────────────────────────────────
    if (action === "stats.recent") {
      const limit = Number(req.query.limit) || 5;
      const { data, error } = await sb.from("entries").select("*")
        .order("date", { ascending: false }).order("id", { ascending: false }).limit(limit);
      if (error) return res.status(500).json({ error: error.message });
      return res.json(data.map(rowToEntry));
    }

    if (action === "stats.summary") {
      const year = Number(req.query.year) || new Date().getFullYear();
      const yearStart = year + "-01-01", yearEnd = year + "-12-31";
      const now = new Date();
      const iso = (d) => d.toISOString().slice(0, 10);
      const sow = (d) => { const x = new Date(d); const k = (x.getDay() + 6) % 7; x.setDate(x.getDate() - k); x.setHours(0, 0, 0, 0); return x; };
      const wkStart = iso(sow(now)); const wkEndD = sow(now); wkEndD.setDate(wkEndD.getDate() + 6); const wkEnd = iso(wkEndD);
      const moStart = iso(new Date(now.getFullYear(), now.getMonth(), 1));
      const moEnd = iso(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      const today = iso(now);

      const { data: yearRows, error } = await sb.from("entries").select("*").gte("date", yearStart).lte("date", yearEnd);
      if (error) return res.status(500).json({ error: error.message });

      const inR = (a, b) => yearRows.filter((r) => r.date >= a && r.date <= b);
      const sumH = (rows) => rows.reduce((s, r) => s + (Number(r.hours) || 0), 0);
      const catMap = new Map(), monthMap = new Map(), statusMap = new Map();
      for (const r of yearRows) {
        catMap.set(r.category, catMap.get(r.category) || { name: r.category, count: 0, hours: 0 });
        const c = catMap.get(r.category); c.count++; c.hours += Number(r.hours) || 0;
        const m = r.date.slice(0, 7);
        monthMap.set(m, monthMap.get(m) || { month: m, count: 0, hours: 0 });
        const mo = monthMap.get(m); mo.count++; mo.hours += Number(r.hours) || 0;
        statusMap.set(r.status, (statusMap.get(r.status) || 0) + 1);
      }

      const { data: dateRows } = await sb.from("entries").select("date").order("date", { ascending: false }).limit(400);
      const dates = new Set((dateRows || []).map((r) => r.date));
      let streak = 0; const cur = new Date(today);
      if (!dates.has(today)) {
        cur.setDate(cur.getDate() - 1);
        if (dates.has(iso(cur))) { while (dates.has(iso(cur))) { streak++; cur.setDate(cur.getDate() - 1); } }
      } else { while (dates.has(iso(cur))) { streak++; cur.setDate(cur.getDate() - 1); } }

      return res.json({
        year,
        yearEntries: yearRows.length, yearHours: sumH(yearRows),
        monthEntries: inR(moStart, moEnd).length, monthHours: sumH(inR(moStart, moEnd)),
        weekEntries: inR(wkStart, wkEnd).length, weekHours: sumH(inR(wkStart, wkEnd)),
        todayEntries: inR(today, today).length,
        streak,
        categories: [...catMap.values()].sort((a, b) => b.count - a.count),
        monthly: [...monthMap.values()].sort((a, b) => a.month.localeCompare(b.month)),
        status: [...statusMap.entries()].map(([name, count]) => ({ name, count })),
      });
    }

    // ── DATA ─────────────────────────────────────────────
    if (action === "data.backup") {
      const { data: entries } = await sb.from("entries").select("*").order("date");
      const { data: categories } = await sb.from("categories").select("*").order("sort");
      return res.json({ exportedAt: new Date().toISOString(), version: 2, entries: (entries || []).map(rowToEntry), categories: categories || [] });
    }

    if (action === "data.restore") {
      const { entries = [], categories = [], mode = "merge" } = req.body || {};
      if (mode === "replace") {
        await sb.from("entries").delete().neq("id", 0);
        await sb.from("categories").delete().neq("id", 0);
      }
      if (entries.length) await sb.from("entries").insert(entries.map(bodyToRow));
      if (categories.length) {
        const rows = categories.map((c, i) => ({ name: c.name, color: c.color || "#64748b", sort: c.sort ?? i }));
        await sb.from("categories").upsert(rows, { onConflict: "name" });
      }
      const { count } = await sb.from("entries").select("*", { count: "exact", head: true });
      return res.json({ ok: true, entries: count });
    }

    if (action === "data.import-csv") {
      const { csv } = req.body || {};
      if (!csv) return res.status(400).json({ error: "csv required" });
      const rows = parseCsv(csv);
      if (rows.length < 2) return res.json({ ok: true, inserted: 0 });
      const header = rows[0].map((h) => h.trim());
      const idx = Object.fromEntries(header.map((h, i) => [h, i]));
      const toInsert = [];
      for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r[idx.date]) continue;
        toInsert.push({
          date: r[idx.date],
          title: r[idx.title] || "Untitled",
          description: r[idx.description] || "",
          category: r[idx.category] || "Other",
          project: r[idx.project] || "",
          hours: Number(r[idx.hours]) || 0,
          status: r[idx.status] || "Completed",
          is_highlight: (r[idx.isHighlight] || "").toLowerCase() === "true" || r[idx.isHighlight] === "1",
          links: r[idx.links] ? [r[idx.links]] : [],
        });
      }
      if (toInsert.length) await sb.from("entries").insert(toInsert);
      return res.json({ ok: true, inserted: toInsert.length });
    }

    // Unknown action
    return res.status(404).json({ error: `Unknown action: ${action}` });
  } catch (err) {
    console.error("[api error]", err);
    return res.status(500).json({ error: err.message, stack: (err.stack || "").split("\n").slice(0, 5) });
  }
}

// ─── CSV parser ───
function parseCsv(text) {
  const rows = [];
  let row = [], cur = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { row.push(cur); cur = ""; }
      else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
      else if (c !== "\r") cur += c;
    }
  }
  if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
  return rows;
}
