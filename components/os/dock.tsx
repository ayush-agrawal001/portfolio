'use client';

import { motion, useAnimationControls, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from 'framer-motion';
import Link from 'next/link';
import { useRef, type ReactNode } from 'react';
import { PROFILE_LINKS } from '@/lib/ask/knowledge';
import { GLASS, OS, SERIF, type AppId } from './theme';

const BASE = 50; // resting icon size
const MAX = 78; // size under the pointer
const RANGE = 150; // how far the magnification reaches, in px
const MOBILE_SIZE = 52;

type Item = {
  id: string;
  label: string;
  /** CSS background of the icon tile. */
  bg: string;
  /** Glyph, drawn in a 48×48 box so it scales with the tile. */
  glyph: ReactNode;
  app?: AppId;
  href?: string;
  launcher?: boolean;
  tour?: string;
};

const LAUNCHPAD_DOTS = [OS.red, OS.orange, OS.yellow, OS.green, OS.cyan, OS.accent, OS.purple, OS.pink, OS.text];

const ITEMS: Item[] = [
  {
    id: 'launchpad',
    label: 'Launchpad',
    launcher: true,
    bg: 'linear-gradient(180deg, #5A5A70 0%, #2C2C3A 100%)',
    glyph: LAUNCHPAD_DOTS.map((c, i) => (
      <rect key={i} x={10.5 + (i % 3) * 10} y={10.5 + Math.floor(i / 3) * 10} width={7} height={7} rx={2.2} fill={c} />
    )),
  },
  {
    id: 'ask',
    label: 'Ask Ayush',
    app: 'ask',
    tour: 'ask-icon',
    bg: 'linear-gradient(180deg, #DC5A55 0%, #A9333B 100%)',
    glyph: (
      <text x={24} y={33.5} textAnchor="middle" fontSize={27} fontWeight={700} fill="#F2ECD6" style={{ fontFamily: SERIF }}>
        問
      </text>
    ),
  },
  {
    id: 'projects',
    label: 'Projects',
    app: 'projects',
    bg: 'linear-gradient(180deg, #8FD0EA 0%, #4A86C8 100%)',
    glyph: (
      <>
        <path d="M10 18a3 3 0 0 1 3-3h7.2l3 3.4H35a3 3 0 0 1 3 3V32a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3z" fill="#F7FBFF" />
        <path d="M10 22.5h28" stroke="#4A86C8" strokeWidth={1.4} opacity={0.35} />
      </>
    ),
  },
  {
    id: 'terminal',
    label: 'Terminal',
    app: 'terminal',
    bg: 'linear-gradient(180deg, #3C3C48 0%, #131318 100%)',
    glyph: (
      <>
        <path d="M13 17l7.5 6.5L13 30" fill="none" stroke="#F2ECD6" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M24 31h11" stroke={OS.green} strokeWidth={3.2} strokeLinecap="round" />
      </>
    ),
  },
  {
    id: 'music',
    label: 'The Smiths',
    app: 'music',
    bg: 'linear-gradient(180deg, #2BE57A 0%, #129A48 100%)',
    glyph: (
      <>
        <rect x={12} y={22} width={4.5} height={14} rx={2.2} fill="#0B1F12" />
        <rect x={19} y={14} width={4.5} height={22} rx={2.2} fill="#0B1F12" />
        <rect x={26} y={18} width={4.5} height={18} rx={2.2} fill="#0B1F12" />
        <rect x={33} y={25} width={4.5} height={11} rx={2.2} fill="#0B1F12" />
      </>
    ),
  },
  {
    id: 'resume',
    label: 'Résumé',
    app: 'resume',
    bg: 'linear-gradient(180deg, #FCF8EC 0%, #D9D2BA 100%)',
    glyph: (
      <>
        <rect x={13} y={12} width={22} height={4.5} rx={2.2} fill={OS.orange} />
        <path d="M13 22.5h22M13 28h22M13 33.5h14" stroke="#54546D" strokeWidth={2.6} strokeLinecap="round" />
      </>
    ),
  },
  {
    id: 'mail',
    label: 'Mail',
    href: `mailto:${PROFILE_LINKS.email}`,
    bg: 'linear-gradient(180deg, #7DBDF7 0%, #2E6EDD 100%)',
    glyph: (
      <>
        <rect x={9} y={14} width={30} height={20.5} rx={4} fill="#F7FBFF" />
        <path d="M10.5 16.5L24 27l13.5-10.5" fill="none" stroke="#2E6EDD" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
];

type Props = {
  mobile: boolean;
  askIsNew: boolean;
  /** Apps with a window open (shown or minimised): they get the dot under their icon. */
  running: Record<AppId, boolean>;
  launcherOpen: boolean;
  onOpen: (app: AppId) => void;
  onLauncher: () => void;
};

/** The macOS Dock: frosted shelf, icons that swell under the pointer, a dot under whatever is running. */
export function Dock({ mobile, askIsNew, running, launcherOpen, onOpen, onLauncher }: Props) {
  const reduce = useReducedMotion();
  const mouseX = useMotionValue(Infinity);
  const magnify = !mobile && !reduce;
  const size = mobile ? MOBILE_SIZE : BASE;
  // On phones the ensō in the menu bar opens the app menu, so the shelf keeps to the five apps.
  const items = mobile ? ITEMS.filter((it) => !it.launcher) : ITEMS;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-2 z-[60] flex justify-center px-2">
      <div
        data-tour="dock"
        role="toolbar"
        aria-label="Dock"
        onMouseMove={(e) => magnify && mouseX.set(e.clientX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className={`pointer-events-auto flex items-end rounded-[22px] px-2.5 pb-2 ${mobile ? 'w-full justify-around' : 'gap-2'}`}
        style={{
          height: size + 16,
          background: 'rgba(54,54,70,0.42)',
          border: '1px solid rgba(255,255,255,0.16)',
          boxShadow: '0 16px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
          ...GLASS,
        }}
      >
        {items.map((item) => (
          <div key={item.id} className="contents">
            {item.id === 'resume' && !mobile && <span className="mx-0.5 mb-1 w-px self-end" style={{ height: BASE - 8, background: 'rgba(255,255,255,0.22)' }} aria-hidden />}
            <DockIcon
              item={item}
              mouseX={mouseX}
              magnify={magnify}
              size={size}
              running={item.app ? running[item.app] : !!item.launcher && launcherOpen}
              badge={item.app === 'ask' && askIsNew}
              showLabel={!mobile}
              onClick={item.launcher ? onLauncher : item.app ? () => onOpen(item.app as AppId) : undefined}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

type IconProps = {
  item: Item;
  mouseX: MotionValue<number>;
  magnify: boolean;
  size: number;
  running: boolean;
  badge: boolean;
  showLabel: boolean;
  onClick?: () => void;
};

function DockIcon({ item, mouseX, magnify, size, running, badge, showLabel, onClick }: IconProps) {
  const ref = useRef<HTMLDivElement>(null);
  const hop = useAnimationControls();
  const distance = useTransform(mouseX, (x) => {
    const b = ref.current?.getBoundingClientRect();
    return b ? x - b.left - b.width / 2 : Infinity;
  });
  const swell = useSpring(useTransform(distance, [-RANGE, 0, RANGE], [BASE, MAX, BASE]), { mass: 0.1, stiffness: 180, damping: 14 });

  const body = (
    <>
      {showLabel && (
        <span
          className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          style={{ background: 'rgba(31,31,40,0.88)', border: '1px solid rgba(255,255,255,0.14)', color: OS.text, ...GLASS }}
        >
          {item.label}
        </span>
      )}
      <span
        className="block h-full w-full overflow-hidden transition-[filter] group-active:brightness-75"
        style={{
          borderRadius: '23%',
          background: item.bg,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), inset 0 0 0 0.5px rgba(255,255,255,0.14), 0 4px 10px rgba(0,0,0,0.35)',
        }}
      >
        <svg viewBox="0 0 48 48" className="h-full w-full" aria-hidden>{item.glyph}</svg>
      </span>
      {badge && (
        <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2" style={{ background: '#FF453A', borderColor: 'rgba(31,31,40,0.9)' }}>
          <span className="sr-only">new</span>
        </span>
      )}
      <span
        className="absolute -bottom-[6px] left-1/2 h-1 w-1 -translate-x-1/2 rounded-full transition-opacity"
        style={{ background: OS.text, opacity: running ? 0.9 : 0 }}
        aria-hidden
      />
    </>
  );

  const cls = 'group relative block h-full w-full rounded-[23%] outline-none focus-visible:ring-2 focus-visible:ring-white/70';
  return (
    <motion.div
      ref={ref}
      data-dock-app={item.app}
      className="relative shrink-0"
      style={magnify ? { width: swell, height: swell } : { width: size, height: size }}
      animate={hop}
    >
      {item.href ? (
        item.href.startsWith('/') ? (
          <Link href={item.href} aria-label={item.label} data-tour={item.tour} className={cls}>{body}</Link>
        ) : (
          <a href={item.href} aria-label={item.label} data-tour={item.tour} className={cls}>{body}</a>
        )
      ) : (
        <button
          type="button"
          aria-label={item.label}
          data-tour={item.tour}
          className={cls}
          onClick={() => {
            // Launching bounces, like the real thing.
            if (!running && magnify) hop.start({ y: [0, -18, 0, -8, 0], transition: { duration: 0.7, ease: 'easeOut' } });
            onClick?.();
          }}
        >
          {body}
        </button>
      )}
    </motion.div>
  );
}
