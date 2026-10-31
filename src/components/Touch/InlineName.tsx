// Naming something in place: the button becomes a text field with Keep and ×, no browser prompt
// (the desktop app has none, and the game keeps to its own panels).
import { useState, type ReactNode } from 'react';

export function InlineName({ value, onSave, children, className, testid }: { value: string; onSave: (name: string) => void; children: ReactNode; className?: string; testid?: string }) {
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState(value);
  if (!edit) return <button className={className ?? 'btn'} onClick={(e) => { e.stopPropagation(); setV(value); setEdit(true); }} data-testid={testid}>{children}</button>;
  const keep = () => { const n = v.trim(); if (n) onSave(n); setEdit(false); };
  return (
    <span className="inline-name" onClick={(e) => e.stopPropagation()} data-testid={testid ? `${testid}-edit` : undefined}>
      <input autoFocus value={v} maxLength={40} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') keep(); if (e.key === 'Escape') setEdit(false); }} aria-label="A name" />
      <button className="btn primary small" onClick={keep} data-testid={testid ? `${testid}-keep` : undefined}>Keep</button>
      <button className="btn small" onClick={() => setEdit(false)} aria-label="Cancel">×</button>
    </span>
  );
}
