'use client';

import { useEffect, useState } from 'react';
import { PROFILE_LINKS } from '@/lib/ask/knowledge';
import { EnsoIcon, WifiIcon } from './icons';
import { BAR_H, GLASS, OS } from './theme';

export function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

type BatteryManagerLike = { level: number; addEventListener: (e: string, fn: () => void) => void };

export function useBattery() {
  const [level, setLevel] = useState(82);
  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryManagerLike> };
    nav.getBattery?.()
      .then((b) => {
        setLevel(Math.round(b.level * 100));
        b.addEventListener('levelchange', () => setLevel(Math.round(b.level * 100)));
      })
      .catch(() => {});
  }, []);
  return level;
}

const pad = (n: number) => String(n).padStart(2, '0');
const ITEM = 'flex h-[22px] items-center rounded-[5px] px-2 transition-colors hover:bg-white/15';

type Props = {
  mobile: boolean;
  /** Name of the frontmost app, shown in bold like the macOS application menu. */
  appName: string;
  launcherOpen: boolean;
  ccOpen: boolean;
  onToggleLauncher: () => void;
  onToggleCC: () => void;
  onHelp: () => void;
  onOpenResume: () => void;
};

/** The macOS menu bar: ensō in place of the Apple logo, the frontmost app, then status items on the right. */
export function MenuBar({ mobile, appName, launcherOpen, ccOpen, onToggleLauncher, onToggleCC, onHelp, onOpenResume }: Props) {
  const now = useClock();
  const battery = useBattery();
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const date = now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <nav
      aria-label="Menu bar"
      className="absolute inset-x-0 top-0 z-[60] flex items-center justify-between px-1.5 text-[13px]"
      style={{ height: BAR_H, background: 'rgba(22,22,29,0.45)', color: OS.text, ...GLASS }}
    >
      <div className="flex items-center">
        <button
          type="button"
          onClick={onToggleLauncher}
          data-tour="menu"
          aria-label="App menu"
          aria-expanded={launcherOpen}
          className={`${ITEM} px-2.5`}
          style={{ background: launcherOpen ? 'rgba(255,255,255,0.18)' : undefined }}
        >
          <EnsoIcon size={16} />
        </button>
        {!mobile && <span className="px-2 font-bold">{appName}</span>}
        {!mobile && (
          <>
            <button type="button" onClick={onOpenResume} className={ITEM}>Résumé</button>
            <a href={PROFILE_LINKS.github} target="_blank" rel="noreferrer" className={ITEM}>GitHub</a>
          </>
        )}
        <button type="button" onClick={onHelp} data-tour="help" title="Replay the tour" className={ITEM}>
          Help
        </button>
      </div>

      <div className="flex items-center">
        <span className="flex h-[22px] items-center px-2" aria-hidden><WifiIcon size={14} /></span>
        <span className="flex h-[22px] items-center gap-1.5 px-2" role="img" aria-label={`Battery ${battery}%`}>
          {!mobile && <span className="text-[12px] tabular-nums">{battery}%</span>}
          <svg width="25" height="12" viewBox="0 0 25 12" aria-hidden>
            <rect x="0.5" y="0.5" width="21" height="11" rx="3.2" fill="none" stroke="currentColor" opacity="0.45" />
            <rect x="2" y="2" width={(18 * battery) / 100} height="8" rx="1.8" fill={battery <= 20 ? OS.red : 'currentColor'} />
            <path d="M23 4v4c.8-.3 1.5-1 1.5-2S23.8 4.3 23 4z" fill="currentColor" opacity="0.5" />
          </svg>
        </span>
        <button
          type="button"
          onClick={onToggleCC}
          data-tour="clock"
          aria-label="Control center"
          aria-expanded={ccOpen}
          className={`${ITEM} gap-2 tabular-nums`}
          style={{ background: ccOpen ? 'rgba(255,255,255,0.18)' : undefined }}
        >
          <svg width="15" height="14" viewBox="0 0 15 14" fill="currentColor" aria-hidden>
            <path fillRule="evenodd" d="M3.5 0h8a3.5 3.5 0 0 1 0 7h-8a3.5 3.5 0 0 1 0-7zm0 1.4a2.1 2.1 0 1 0 0 4.2 2.1 2.1 0 0 0 0-4.2z" opacity="0.95" />
            <path fillRule="evenodd" d="M3.5 8.2h8a2.9 2.9 0 0 1 0 5.8h-8a2.9 2.9 0 0 1 0-5.8zm8 1.1a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6z" opacity="0.6" />
          </svg>
          {!mobile && <span>{date}</span>}
          <span>{time}</span>
        </button>
      </div>
    </nav>
  );
}
