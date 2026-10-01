'use client';

import { PROJECTS } from '@/lib/ask/knowledge';
import { MONO, OS } from './theme';

export function ProjectsApp({ onPick }: { onPick: (question: string) => void }) {
  return (
    <div className="flex h-full flex-col gap-3.5 overflow-y-auto p-[18px]" style={{ color: OS.text }}>
      <p className="text-[13px]" style={{ color: OS.dim }}>Pick a project and Koby tells you the story behind it.</p>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {PROJECTS.map((p) => (
          <button
            key={p.folder}
            type="button"
            onClick={() => onPick(p.question)}
            className="flex items-center gap-3 rounded-[10px] p-3 text-left transition-colors hover:brightness-125"
            style={{ background: OS.tile }}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-[11px] font-bold" style={{ background: OS.card, borderColor: OS.tileHi, color: p.color, fontFamily: MONO }}>
              {p.initials}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-sm font-semibold">{p.folder}</span>
              <span className="truncate text-xs" style={{ color: OS.dim }}>{p.desc}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
