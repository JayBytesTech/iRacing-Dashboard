'use client';

import { useState } from 'react';
import { buildSessionMarkdown } from '@/lib/sessionReport';
import type { JournalSession, SessionDetail } from '@/lib/journal';

// Share a session as a clean markdown summary — copy to clipboard (paste to a co-driver) or download a
// .md file. Both are built client-side from data already on the page; nothing leaves the machine.

export function ShareReport({ session, detail }: { session: JournalSession; detail: SessionDetail | null }) {
  const [copied, setCopied] = useState(false);
  const markdown = () => buildSessionMarkdown(session, detail);

  async function copy() {
    const text = markdown();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API can be blocked (no focus / insecure context) — fall back to execCommand.
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } finally {
        ta.remove();
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function download() {
    const blob = new Blob([markdown()], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slug(session)}.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
      <button onClick={copy} style={btn(true)} aria-label="Copy session report to clipboard">
        {copied ? 'Copied ✓' : 'Copy report'}
      </button>
      <button onClick={download} style={btn(false)} aria-label="Download session report as markdown">
        .md
      </button>
    </span>
  );
}

function btn(primary: boolean): React.CSSProperties {
  return {
    fontSize: 13,
    fontWeight: 600,
    padding: '5px 12px',
    borderRadius: 8,
    cursor: 'pointer',
    color: primary ? '#0b0e14' : '#cdd6e4',
    background: primary ? '#6aa3ff' : '#1b2130',
    border: '1px solid #2a3142',
  };
}

function slug(session: JournalSession): string {
  const date = session.capturedAt.slice(0, 10);
  const name = [session.track, session.trackConfig, session.sessionType].filter(Boolean).join('-');
  return `${date}-${name || 'session'}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-');
}
