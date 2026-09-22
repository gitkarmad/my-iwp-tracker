import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useApi } from '../api/client.js';

export default function EntryCard({ entry, onChanged, onEdit }) {
  const api = useApi();
  const [expanded, setExpanded] = useState(false);
  const star = async () => { await api.toggleStar(entry.id); if (onChanged) onChanged(); };
  const del = async () => { if (confirm("Delete this entry?")) { await api.deleteEntry(entry.id); if (onChanged) onChanged(); } };
  const dup = async () => { await api.duplicate(entry.id); if (onChanged) onChanged(); };
  return (
    <div className="rounded-lg border border-border bg-panel p-4 hover:shadow-sm transition">
      <div className="flex items-start gap-3">
        <button onClick={star} title="Highlight" className={"text-lg leading-none " + (entry.isHighlight ? "text-yellow-500" : "text-muted hover:text-yellow-500")}>
          {entry.isHighlight ? "★" : "☆"}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3 className="font-medium truncate">{entry.title}</h3>
            {entry.status !== "Completed" && (
              <span className="text-xs px-2 py-0.5 rounded-full border border-border text-muted">{entry.status}</span>
            )}
          </div>
          <div className="text-xs text-muted mt-1 flex items-center gap-2 flex-wrap">
            <span>{entry.date}</span><span>·</span><span>{entry.category}</span>
            {entry.project && <><span>·</span><span>{entry.project}</span></>}
            {entry.hours > 0 && <><span>·</span><span>{entry.hours}h</span></>}
          </div>
          {entry.description && (
            <div className={"md text-sm mt-2 " + (expanded ? "" : "line-clamp-2")}>
              <ReactMarkdown>{entry.description}</ReactMarkdown>
            </div>
          )}
          {entry.links && entry.links.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {entry.links.map((l, i) => (
                <a key={i} href={l} target="_blank" rel="noreferrer" className="text-xs text-accent underline truncate max-w-[200px]">{l}</a>
              ))}
            </div>
          )}
          <div className="mt-3 flex items-center gap-3 text-xs text-muted">
            {entry.description && <button onClick={() => setExpanded((e) => !e)} className="hover:text-text">{expanded ? "Show less" : "Show more"}</button>}
            <button onClick={() => onEdit && onEdit(entry)} className="hover:text-text">Edit</button>
            <button onClick={dup} className="hover:text-text">Duplicate</button>
            <button onClick={del} className="hover:text-red-500">Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
}
