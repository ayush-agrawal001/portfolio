'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useState, type ComponentType } from 'react';
import { PROFILE_LINKS } from '@/lib/ask/knowledge';
import { AskBadge, BellIcon, BluetoothIcon, ClearAllIcon, CloseIcon, DndIcon, FullscreenIcon, MicIcon, RecordIcon, WifiIcon } from './icons';
import { DISPLAY, PANEL, MONO, OS, WALLPAPERS } from './theme';

type ToggleKey = 'wifi' | 'bt' | 'dnd' | 'mic' | 'rec' | 'full';
const TOGGLES: { key: ToggleKey; label: string; Icon: ComponentType<{ size?: number }> }[] = [
  { key: 'wifi', label: 'Wi-Fi', Icon: WifiIcon },
  { key: 'bt', label: 'Bluetooth', Icon: BluetoothIcon },
  { key: 'dnd', label: 'Do not disturb', Icon: DndIcon },
  { key: 'mic', label: 'Microphone', Icon: MicIcon },
  { key: 'rec', label: 'Screen record', Icon: RecordIcon },
  { key: 'full', label: 'Fullscreen', Icon: FullscreenIcon },
];

type Props = { mobile: boolean; onOpenAsk: () => void; wallpaper: string; onWallpaper: (id: string) => void };

export function ControlCenter({ mobile, onOpenAsk, wallpaper, onWallpaper }: Props) {
  const reduce = useReducedMotion();
  const [on, setOn] = useState<Record<ToggleKey, boolean>>({ wifi: true, bt: false, dnd: false, mic: true, rec: false, full: false });
  const [notes, setNotes] = useState({ ask: true, hire: true, how: true });
  const [volume, setVolume] = useState(56);

  const toggle = (key: ToggleKey) => {
    if (key === 'full') {
      const el = document.documentElement;
      if (!document.fullscreenElement) el.requestFullscreen?.().catch(() => {});
      else document.exitFullscreen?.().catch(() => {});
    }
    setOn((s) => ({ ...s, [key]: !s[key] }));
  };

  const none = !notes.ask && !notes.hire && !notes.how;

  return (
    <motion.aside
      aria-label="Control center"
      initial={reduce ? false : { opacity: 0, x: mobile ? 0 : 24, y: mobile ? 24 : 0 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, x: mobile ? 0 : 24, y: mobile ? 24 : 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 34 }}
      className={`absolute z-[62] flex flex-col gap-5 overflow-y-auto rounded-2xl px-5 pb-5 pt-6 shadow-[0_24px_60px_rgba(0,0,0,0.45)] ${
        mobile ? 'inset-x-2 bottom-[84px] top-9' : 'bottom-2 right-2 top-9 w-[384px]'
      }`}
      style={{ ...PANEL, color: OS.text }}
    >
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <span className="h-9 w-9 overflow-hidden rounded-full border" style={{ borderColor: OS.tileHi, background: '#000' }}>
          <img src="/ayush-ascii.png" alt="ASCII-art portrait of Ayush" className="h-full w-full object-cover" style={{ objectPosition: '52% 40%', transform: 'scale(1.9)' }} />
        </span>
        <span className="flex-1 text-xl tracking-tight" style={{ fontFamily: DISPLAY, fontWeight: 700 }}>Hi, visitor!</span>
        <span className="text-[15px]" style={{ color: OS.muted }}>open to work</span>
      </div>

      <div className="flex items-center justify-between gap-2">
        {TOGGLES.map(({ key, label, Icon }, i) => (
          <div key={key} className="contents">
            {i === 4 && <span className="h-9 w-0.5 rounded-sm" style={{ background: OS.tileHi }} aria-hidden />}
            <button
              type="button"
              aria-label={label}
              aria-pressed={on[key]}
              onClick={() => toggle(key)}
              className="flex h-11 w-11 items-center justify-center rounded-xl transition-colors"
              style={{ background: on[key] ? OS.accent : OS.tile, color: on[key] ? OS.panelDeep : OS.text }}
            >
              <Icon size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex min-h-[250px] flex-1 flex-col gap-3.5 rounded-xl p-5" style={{ background: 'rgba(42,42,55,0.7)' }}>
        <div className="flex items-center justify-between">
          <span className="text-[17px] font-medium">Notifications</span>
          <button type="button" aria-label="Clear all notifications" onClick={() => setNotes({ ask: false, hire: false, how: false })} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/10" style={{ color: OS.accent }}>
            <ClearAllIcon />
          </button>
        </div>

        {notes.ask && (
          <Notification title="New notification from Ask Ayush" onDismiss={() => setNotes((n) => ({ ...n, ask: false }))}>
            <button type="button" onClick={onOpenAsk} className="flex w-full items-start gap-3.5 px-3 py-3.5 text-left">
              <AskBadge size={36} />
              <span className="flex flex-col gap-1.5">
                <span className="text-[13px] leading-[1.45]">Instead of reading Ayush’s whole résumé, just ask me. I’m Koby, his assistant.</span>
                <span className="text-xs font-semibold" style={{ color: OS.accent }}>Open Ask Ayush →</span>
              </span>
            </button>
          </Notification>
        )}

        {notes.hire && (
          <Notification title="Want to hire Ayush?" onDismiss={() => setNotes((n) => ({ ...n, hire: false }))}>
            <div className="flex items-start gap-3.5 px-3 py-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold" style={{ background: OS.green, color: OS.panelDeep, fontFamily: MONO }}>{'>_'}</span>
              <span className="text-[13px] leading-[1.45]">
                Type <span style={{ color: OS.accent, fontFamily: MONO }}>sudo hire ayush</span> in the terminal. You don’t have root, lol.{' '}
                <a href={`mailto:${PROFILE_LINKS.email}`} className="underline underline-offset-2">Email works though.</a>
              </span>
            </div>
          </Notification>
        )}

        {notes.how && (
          <Notification title="How this desktop works" onDismiss={() => setNotes((n) => ({ ...n, how: false }))}>
            <p className="px-3 py-3 text-[13px] leading-relaxed text-[#DCD7BA]">
              The brush circle at the top left opens the app menu, the clock opens this panel, and the apps live in the Dock.
            </p>
          </Notification>
        )}

        {none && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm" style={{ color: OS.muted }}>
            <BellIcon />
            All caught up. Go ask Ayush something.
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-3 rounded-xl p-4" style={{ background: 'rgba(42,42,55,0.7)' }}>
        <span className="text-sm">Wallpaper</span>
        <div className="grid grid-cols-4 gap-2">
          {WALLPAPERS.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => onWallpaper(w.id)}
              aria-pressed={wallpaper === w.id}
              aria-label={`Wallpaper: ${w.name}`}
              title={w.name}
              className="relative aspect-video overflow-hidden rounded-lg transition-transform hover:scale-[1.03]"
              style={{ outline: wallpaper === w.id ? `2px solid ${OS.purple}` : `1px solid ${OS.tileHi}`, outlineOffset: wallpaper === w.id ? 2 : 0 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={w.src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-3 rounded-xl p-5" style={{ background: 'rgba(42,42,55,0.7)' }}>
        <label htmlFor="cc-volume" className="text-sm">Volume</label>
        <input
          id="cc-volume"
          type="range"
          min={0}
          max={100}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="h-3.5 w-full cursor-pointer"
          style={{ accentColor: OS.accent }}
        />
        <span className="mt-2 text-sm">Caffeine</span>
        <div className="h-3.5 overflow-hidden rounded-full" style={{ background: OS.tile }} role="img" aria-label="Caffeine 88%">
          <div className="h-full w-[88%] rounded-full" style={{ background: OS.accent }} />
        </div>
      </div>
    </motion.aside>
  );
}

function Notification({ title, onDismiss, children }: { title: string; onDismiss: () => void; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-md" style={{ background: OS.tile }}>
      <div className="flex h-9 items-center justify-between pl-3 pr-1.5 text-[13px]" style={{ background: OS.tileHi }}>
        <span>{title}</span>
        <button type="button" aria-label={`Dismiss: ${title}`} onClick={onDismiss} className="flex h-7 w-7 items-center justify-center rounded hover:bg-white/10" style={{ color: OS.red }}>
          <CloseIcon size={10} />
        </button>
      </div>
      {children}
    </div>
  );
}
