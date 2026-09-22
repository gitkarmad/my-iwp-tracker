import { useEffect, useMemo, useRef, useState } from 'react';
import { useApi } from '../api/client.js';
import CategoryPie from '../components/charts/CategoryPie.jsx';
import MonthlyBar from '../components/charts/MonthlyBar.jsx';

export default function Report() {
  const api = useApi();
  const thisYear = new Date().getFullYear();
  const [from, setFrom] = useState(thisYear + "-01-01");
  const [to, setTo] = useState(thisYear + "-12-31");
  const [entries, setEntries] = useState([]);
  const [busy, setBusy] = useState("");
  const reportRef = useRef(null);

  useEffect(() => { api.listEntries({ from, to }).then(setEntries).catch(() => {}); }, [from, to]);

  const byCategory = useMemo(() => {
    const m = new Map();
    for (const e of entries) {
      if (!m.has(e.category)) m.set(e.category, { name: e.category, count: 0, hours: 0, items: [] });
      const a = m.get(e.category); a.count++; a.hours += e.hours || 0; a.items.push(e);
    }
    return [...m.values()].sort((a, b) => b.count - a.count);
  }, [entries]);

  const byProject = useMemo(() => {
    const m = new Map();
    for (const e of entries.filter((x) => x.project)) {
      if (!m.has(e.project)) m.set(e.project, { name: e.project, count: 0, hours: 0, items: [] });
      const a = m.get(e.project); a.count++; a.hours += e.hours || 0; a.items.push(e);
    }
    return [...m.values()].sort((a, b) => b.count - a.count);
  }, [entries]);

  const byMonth = useMemo(() => {
    const m = new Map();
    for (const e of entries) {
      const k = e.date.slice(0, 7);
      if (!m.has(k)) m.set(k, { month: k, count: 0, hours: 0 });
      const a = m.get(k); a.count++; a.hours += e.hours || 0;
    }
    return [...m.values()].sort((a, b) => a.month.localeCompare(b.month));
  }, [entries]);

  const highlights = entries.filter((e) => e.isHighlight);
  const totalHours = entries.reduce((s, e) => s + (e.hours || 0), 0);

  const exportPdf = async () => {
    setBusy("pdf");
    try {
      const { jsPDF } = await import("jspdf");
      const html2canvas = (await import("html2canvas")).default;
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();
      doc.setFontSize(28); doc.text("IWP Work Report", 40, 100);
      doc.setFontSize(14); doc.text(from + "  →  " + to, 40, 130);
      doc.setFontSize(12);
      doc.text("Total entries: " + entries.length, 40, 170);
      doc.text("Total hours: " + totalHours.toFixed(1), 40, 190);
      doc.text("Highlights: " + highlights.length, 40, 210);
      if (reportRef.current) {
        const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: "#fff" });
        const img = canvas.toDataURL("image/png");
        const iw = pw - 80; const ih = (canvas.height * iw) / canvas.width;
        doc.addPage();
        let y = 40;
        if (y + ih > ph - 40) { doc.addPage(); y = 40; }
        doc.addImage(img, "PNG", 40, y, iw, ih);
      }
      doc.save("iwp-report-" + from + "_" + to + ".pdf");
    } finally { setBusy(""); }
  };

  const exportXlsx = async () => {
    setBusy("xlsx");
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      const rows = entries.map((e) => ({
        Date: e.date, Title: e.title, Category: e.category, Project: e.project,
        Hours: e.hours, Status: e.status, Highlight: e.isHighlight ? "Yes" : "",
        Description: e.description, Links: (e.links || []).join(" | "),
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Entries");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(byCategory.map((x) => ({ name: x.name, count: x.count, hours: x.hours }))), "By Category");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(byProject.map((x) => ({ name: x.name, count: x.count, hours: x.hours }))), "By Project");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(byMonth), "By Month");
      XLSX.writeFile(wb, "iwp-report-" + from + "_" + to + ".xlsx");
    } finally { setBusy(""); }
  };

  const exportMarkdown = () => {
    const lines = [];
    lines.push("# IWP Work Report", "", "**Range:** " + from + " → " + to, "");
    lines.push("- Entries: **" + entries.length + "**");
    lines.push("- Hours: **" + totalHours.toFixed(1) + "**");
    lines.push("- Highlights: **" + highlights.length + "**", "");
    if (highlights.length) {
      lines.push("## Highlights", "");
      for (const e of highlights) lines.push("- " + e.date + " — **" + e.title + "** (" + e.category + ")");
      lines.push("");
    }
    lines.push("## By Category", "");
    for (const c of byCategory) lines.push("- **" + c.name + "** — " + c.count + " entries, " + c.hours.toFixed(1) + "h");
    lines.push("", "## By Project", "");
    for (const p of byProject) lines.push("- **" + p.name + "** — " + p.count + " entries, " + p.hours.toFixed(1) + "h");
    lines.push("", "## Month-by-month", "");
    for (const m of byMonth) lines.push("- " + m.month + ": " + m.count + " entries, " + m.hours.toFixed(1) + "h");
    lines.push("", "## All entries", "");
    for (const e of entries) {
      lines.push("### " + e.date + " — " + e.title);
      lines.push("*Category:* " + e.category + (e.project ? "  ·  *Project:* " + e.project : "") + (e.hours ? "  ·  *Hours:* " + e.hours : "") + (e.isHighlight ? "  ·  ⭐" : ""));
      if (e.description) lines.push("", e.description);
      lines.push("");
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "iwp-report-" + from + "_" + to + ".md"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-semibold">Annual Report</h1>
        <div className="flex gap-2 flex-wrap">
          <button onClick={exportPdf} disabled={!!busy} className="rounded-md border border-border px-3 py-2 text-sm">
            {busy === "pdf" ? "Generating…" : "Export PDF"}
          </button>
          <button onClick={exportXlsx} disabled={!!busy} className="rounded-md border border-border px-3 py-2 text-sm">
            {busy === "xlsx" ? "Generating…" : "Export Excel"}
          </button>
          <button onClick={exportMarkdown} className="rounded-md bg-accent text-white px-3 py-2 text-sm">Export Markdown</button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="text-sm"><div className="text-muted mb-1">From</div>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="w-full rounded-md border border-border bg-panel px-3 py-2" /></label>
        <label className="text-sm"><div className="text-muted mb-1">To</div>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="w-full rounded-md border border-border bg-panel px-3 py-2" /></label>
        <div className="flex items-end gap-2 flex-wrap">
          <button onClick={() => { setFrom(thisYear + "-01-01"); setTo(thisYear + "-12-31"); }} className="rounded-md border border-border px-3 py-2 text-sm">This year</button>
          <button onClick={() => { setFrom(thisYear + "-01-01"); setTo(thisYear + "-06-30"); }} className="rounded-md border border-border px-3 py-2 text-sm">H1</button>
          <button onClick={() => { setFrom(thisYear + "-01-01"); setTo(thisYear + "-03-31"); }} className="rounded-md border border-border px-3 py-2 text-sm">Q1</button>
        </div>
      </div>
      <div ref={reportRef} className="bg-panel border border-border rounded-lg p-5 space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Summary</h2>
          <div className="text-sm text-muted">{from} → {to}</div>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="rounded-lg border border-border p-3"><div className="text-xs text-muted">Entries</div><div className="text-xl font-semibold">{entries.length}</div></div>
            <div className="rounded-lg border border-border p-3"><div className="text-xs text-muted">Hours</div><div className="text-xl font-semibold">{totalHours.toFixed(1)}</div></div>
            <div className="rounded-lg border border-border p-3"><div className="text-xs text-muted">Highlights</div><div className="text-xl font-semibold">{highlights.length}</div></div>
          </div>
        </div>
        {byCategory.length > 0 && <div><h2 className="text-lg font-semibold mb-2">Category breakdown</h2><CategoryPie data={byCategory} /></div>}
        {byMonth.length > 0 && <div><h2 className="text-lg font-semibold mb-2">Monthly activity</h2><MonthlyBar data={byMonth} /></div>}
        {highlights.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-2">⭐ Highlights</h2>
            <ul className="space-y-2 text-sm">
              {highlights.map((e) => (
                <li key={e.id} className="border border-border rounded-md p-3">
                  <div className="font-medium">{e.title}</div>
                  <div className="text-xs text-muted mt-1">{e.date} · {e.category}{e.project ? " · " + e.project : ""}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <h2 className="text-lg font-semibold mb-2">By Category</h2>
          {byCategory.map((c) => (
            <details key={c.name} className="border border-border rounded-md mb-2">
              <summary className="cursor-pointer px-3 py-2 text-sm"><b>{c.name}</b> — {c.count} entries, {c.hours.toFixed(1)}h</summary>
              <ul className="px-5 pb-3 text-sm space-y-1">
                {c.items.map((e) => <li key={e.id}>· {e.date} — {e.title}</li>)}
              </ul>
            </details>
          ))}
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-2">By Project</h2>
          {byProject.map((p) => (
            <details key={p.name} className="border border-border rounded-md mb-2">
              <summary className="cursor-pointer px-3 py-2 text-sm"><b>{p.name}</b> — {p.count} entries, {p.hours.toFixed(1)}h</summary>
              <ul className="px-5 pb-3 text-sm space-y-1">
                {p.items.map((e) => <li key={e.id}>· {e.date} — {e.title}</li>)}
              </ul>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
