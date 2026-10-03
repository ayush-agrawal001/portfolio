'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { PROFILE_LINKS, PROJECTS } from '@/lib/ask/knowledge';
import { CodeIcon, DocIcon, GlobeIcon, LockIcon, MailIcon, NextIcon, PlayIcon, PowerIcon, PrevIcon, RestartIcon } from './icons';
import { DISPLAY, PANEL, MONO, OS, type AppId } from './theme';

type LauncherApp = {
  name: string;
  glyph: string;
  fg: string;
  isNew?: boolean;
  open?: AppId;
  href?: string;
};

const APPS: LauncherApp[] = [
  { name: 'Ask Ayush', glyph: '問', fg: OS.red, isNew: true, open: 'ask' },
  { name: 'Projects', glyph: '▤', fg: OS.cyan, open: 'projects' },
  { name: '3D Portfolio', glyph: '◇', fg: OS.red, open: 'threed' },
  { name: 'Terminal (zsh)', glyph: '>_', fg: OS.green, open: 'terminal' },
  { name: 'The Smiths', glyph: '♪', fg: OS.green, open: 'music' },
  { name: 'Résumé', glyph: 'cv', fg: OS.orange, open: 'resume' },
  { name: 'GitHub', glyph: '</>', fg: OS.purple, href: PROFILE_LINKS.github },
  { name: 'LinkedIn', glyph: 'in', fg: OS.cyan, href: PROFILE_LINKS.linkedin },
  { name: 'Mail Ayush', glyph: '@', fg: OS.yellow, href: `mailto:${PROFILE_LINKS.email}` },
];

type Props = {
  mobile: boolean;
  onOpen: (app: AppId) => void;
  onAsk: (question: string) => void;
  onClose: () => void;
};

export function Launcher({ mobile, onOpen, onAsk, onClose }: Props) {
  const reduce = useReducedMotion();
  const [query, setQuery] = useState('');
  const [track, setTrack] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!mobile) searchRef.current?.focus();
  }, [mobile]);

  const apps = useMemo(
    () => (query.trim() ? APPS.filter((a) => a.name.toLowerCase().includes(query.trim().toLowerCase())) : APPS),
    [query],
  );

  const run = (app: LauncherApp) => {
    if (app.open) onOpen(app.open);
    else if (app.href) {
      if (app.href.startsWith('http')) window.open(app.href, '_blank', 'noopener');
      else window.location.href = app.href;
      onClose();
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apps.length === 1) run(apps[0]);
    else if (query.trim()) onAsk(query.trim());
  };

  const project = PROJECTS[(track + PROJECTS.length) % PROJECTS.length];

  return (
    <motion.div
      role="dialog"
      aria-label="App menu"
      className={`absolute z-50 flex overflow-hidden rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.45)] ${
        mobile ? 'inset-x-2 bottom-[84px] top-9 flex-col overflow-y-auto' : 'left-2 top-9 h-[min(562px,calc(100dvh-132px))] w-[600px]'
      }`}
      initial={reduce ? false : { opacity: 0, scale: 0.97, y: mobile ? 24 : -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: mobile ? 24 : -10 }}
      transition={{ type: 'spring', stiffness: 400, damping: 34 }}
      style={{ ...PANEL, color: OS.text, transformOrigin: 'top left' }}
    >
      {!mobile && (
        <div className="flex w-[58px] shrink-0 flex-col items-center justify-end gap-4 py-3" style={{ background: 'rgba(22,22,29,0.55)' }}>
          <SideButton href="/portfolio" label="Switch to the animated résumé"><PowerIcon /></SideButton>
          <SideButton onClick={() => window.location.reload()} label="Restart the desktop"><RestartIcon /></SideButton>
          <SideButton onClick={onClose} label="Lock: close this menu"><LockIcon /></SideButton>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <span className="h-[42px] w-[42px] overflow-hidden rounded-full border" style={{ borderColor: OS.tileHi, background: '#000' }}>
            <img src="/ayush-ascii.png" alt="ASCII-art portrait of Ayush" className="h-full w-full object-cover" style={{ objectPosition: '52% 40%', transform: 'scale(1.9)' }} />
          </span>
        </div>
      )}

      <div className={`flex shrink-0 flex-col gap-1.5 overflow-y-auto px-3 py-3.5 ${mobile ? 'w-full' : 'w-[300px]'}`}>
        <form onSubmit={onSubmit}>
          <label htmlFor="launcher-search" className="sr-only">Search apps, or ask a question</label>
          <input
            ref={searchRef}
            id="launcher-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search apps, or ask me anything…"
            autoComplete="off"
            className="mb-2 h-[42px] w-full rounded-lg px-3.5 text-sm outline-none placeholder:text-[#727169] focus:ring-2"
            style={{ background: OS.tile, color: OS.text, ['--tw-ring-color' as string]: OS.accent }}
          />
        </form>
        {apps.map((a) => (
          <button
            key={a.name}
            type="button"
            onClick={() => run(a)}
            className="flex h-11 shrink-0 items-center gap-3 rounded-lg px-2.5 text-left text-sm transition-colors hover:bg-white/5"
            style={{ background: a.isNew ? OS.tile : undefined }}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-[11px] font-bold" style={{ background: OS.card, borderColor: OS.tileHi, color: a.fg, fontFamily: MONO }}>
              {a.glyph}
            </span>
            <span className="flex-1">{a.name}</span>
            {a.isNew && <span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ background: OS.accent, color: OS.panelDeep, fontFamily: MONO }}>NEW</span>}
          </button>
        ))}
        {apps.length === 0 && (
          <button type="button" onClick={() => onAsk(query.trim())} className="rounded-lg px-2.5 py-3 text-left text-sm hover:bg-white/5" style={{ color: OS.dim }}>
            No app called that. Press Enter to ask Ayush “{query.trim()}”
          </button>
        )}
      </div>

      <div className={`flex min-w-0 flex-1 flex-col gap-2 ${mobile ? 'px-3 pb-3' : 'py-2.5 pr-2.5'}`}>
        <div className="relative h-[150px] shrink-0 overflow-hidden rounded-[10px]" style={{ background: '#2A2A37' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ayush-ascii.png" alt="" className="absolute right-0 top-0 h-full w-[55%] object-cover opacity-60" style={{ objectPosition: 'center 30%', maskImage: 'linear-gradient(to right, transparent, black 45%)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 45%)' }} />
          <div className="absolute inset-x-4 bottom-3.5 top-4 flex flex-col pl-1">
            <span className="text-[26px] tracking-tight" style={{ fontFamily: DISPLAY, fontWeight: 700 }}>Backend intern</span>
            <span className="text-sm text-[#DCD7BA]">Feels like: shipping APIs</span>
            <span className="mt-auto text-xs text-[#DCD7BA]">Botivate · since Jul 2026</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-0.5 rounded-[10px] px-3 pb-1.5 pt-3" style={{ background: 'rgba(42,42,55,0.7)' }}>
          <span className="pb-1.5 text-[13px] font-medium">Find me on</span>
          <SiteLink href={PROFILE_LINKS.github} bg={OS.text} icon={<CodeIcon size={13} />}>GitHub</SiteLink>
          <SiteLink href={PROFILE_LINKS.website} bg={OS.accent} icon={<GlobeIcon size={13} />}>ayush-agrawal.in</SiteLink>
          <SiteLink href={`mailto:${PROFILE_LINKS.email}`} bg={OS.red} icon={<MailIcon size={13} />}>Email</SiteLink>
          <SiteLink href="/portfolio" bg={OS.green} icon={<DocIcon size={13} />}>Résumé</SiteLink>
        </div>

        <div className="flex min-h-[136px] flex-1 items-center gap-3 rounded-[10px] p-2.5" style={{ background: 'rgba(42,42,55,0.7)' }}>
          <div className="relative aspect-square h-full max-h-[116px] min-h-[96px] shrink-0 overflow-hidden rounded-lg" style={{ background: '#000' }} aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ayush-ascii.png" alt="" className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: 'center 30%' }} />
            <span className="absolute bottom-1.5 left-1.5 rounded px-1.5 py-0.5 text-xs font-bold" style={{ background: project.color, color: OS.card, fontFamily: MONO }}>
              {project.initials}
            </span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center">
            <span className="text-[10px] tracking-[0.1em]" style={{ color: OS.dim }}>NOW SHIPPING</span>
            <span className="max-w-full truncate text-[13px] font-semibold uppercase">{project.name}</span>
            <span className="text-[10px] uppercase" style={{ color: OS.dim }}>{project.tag}</span>
            <div className="mt-1.5 flex items-center gap-2.5">
              <button type="button" aria-label="Previous project" onClick={() => setTrack(track - 1)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10"><PrevIcon /></button>
              <button type="button" aria-label={`Ask about ${project.name}`} onClick={() => onAsk(project.question)} className="flex h-9 w-9 items-center justify-center rounded-full border-2" style={{ borderColor: OS.accent }}><PlayIcon /></button>
              <button type="button" aria-label="Next project" onClick={() => setTrack(track + 1)} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-white/10"><NextIcon /></button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SideButton({ href, onClick, label, children }: { href?: string; onClick?: () => void; label: string; children: ReactNode }) {
  const cls = 'flex h-10 w-10 items-center justify-center rounded-[10px] hover:bg-white/10';
  return href ? (
    <Link href={href} aria-label={label} title={label} className={cls}>{children}</Link>
  ) : (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={cls}>{children}</button>
  );
}

function SiteLink({ href, bg, icon, children }: { href: string; bg: string; icon: ReactNode; children: ReactNode }) {
  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel="noreferrer"
      className="flex h-9 items-center gap-3 rounded-md text-[13px] hover:bg-white/5"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: bg, color: OS.panelDeep }}>{icon}</span>
      {children}
    </a>
  );
}
