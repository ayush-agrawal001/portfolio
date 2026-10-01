'use client';

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { BAR_H, GLASS, MONO, OS } from './theme';

export type Rect = { x: number; y: number; w: number; h: number };

type Props = {
  title: string;
  subtitle?: string;
  z: number;
  active: boolean;
  /** Which Dock icon this window pours into when minimised (matches `data-dock-app`). */
  dockId?: string;
  /** Fixed placement (zoomed or mobile); when omitted, `rect` is used and the window can be dragged. */
  placement?: CSSProperties;
  rect?: Rect;
  /** Minimised into the Dock: kept mounted so the app keeps its state, but out of sight. */
  hidden?: boolean;
  onMove?: (rect: Rect) => void;
  onFocus: () => void;
  onClose: () => void;
  onMinimize?: () => void;
  onZoom?: () => void;
  background?: string;
  children: ReactNode;
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const smooth = (t: number) => t * t * (3 - 2 * t);
const easeIn = (t: number) => t * t;
const GENIE_STEPS = 16;
/** Bottom of the window reaches the Dock icon over the first part of the animation... */
const pinchAt = (p: number) => smooth(clamp01(p / 0.55));
/** ...then the top follows it down, and the whole window pours into the icon. */
const pourAt = (p: number) => easeIn(clamp01((p - 0.18) / 0.82));
/** Half-width of the funnel's tip, as a percentage of the window's width. */
const TIP_HALF = 3;

/**
 * The outline of the genie funnel at progress `p` (0 = full window, 1 = poured away), as a
 * clip-path polygon. The sides bow inwards more the lower they are, converging on `tipX`
 * (a percentage across the window), the way macOS pinches a window toward its Dock icon.
 */
function geniePath(p: number, tipX: number): string {
  if (p <= 0) return 'none';
  const pinch = pinchAt(p);
  const pour = pourAt(p);
  const left: string[] = [];
  const right: string[] = [];
  for (let i = 0; i <= GENIE_STEPS; i++) {
    const t = i / GENIE_STEPS;
    // How far down the funnel this row is: the bottom leads, the top catches up as it pours.
    const depth = Math.pow(smooth(t), 1.4);
    const k = clamp01(pinch * depth + pour * (1 - depth));
    const l = k * (tipX - TIP_HALF);
    const r = 100 - k * (100 - (tipX + TIP_HALF));
    left.push(`${l.toFixed(2)}% ${(t * 100).toFixed(2)}%`);
    right.unshift(`${r.toFixed(2)}% ${(t * 100).toFixed(2)}%`);
  }
  return `polygon(${[...left, ...right].join(', ')})`;
}

/** A riced (Hyprland-style) window: gradient border when focused, slim mono title bar, drag it, double-click to zoom, resize from the corner. */
export function WindowFrame({ title, subtitle, z, active, dockId, placement, rect, hidden = false, onMove, onFocus, onClose, onMinimize, onZoom, background = OS.panel, children }: Props) {
  const reduce = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const resize = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const draggable = !placement && rect && onMove;

  // Genie: 0 = on screen, 1 = poured into the Dock. A window starts in the Dock and pours out when it opens.
  const genie = useMotionValue(1);
  const [stowed, setStowed] = useState(hidden);
  // While it runs, the blur and shadow are switched off: they are what make the effect stutter.
  const [animating, setAnimating] = useState(true);
  /** Where the funnel points: tip position across the window (%), then how far the tip must travel (px). */
  const aim = useRef({ tipX: 50, dx: 0, dy: 220 });

  useEffect(() => {
    const target = hidden ? 1 : 0;
    if (reduce) {
      genie.set(target);
      setStowed(hidden);
      setAnimating(false);
      return;
    }

    const win = wrapRef.current?.getBoundingClientRect();
    const icon = dockId ? document.querySelector(`[data-dock-app="${dockId}"]`)?.getBoundingClientRect() : null;
    if (win && win.width > 0 && icon) {
      const cx = icon.left + icon.width / 2;
      const tipX = Math.min(96, Math.max(4, ((cx - win.left) / win.width) * 100));
      aim.current = { tipX, dx: cx - (win.left + (tipX / 100) * win.width), dy: icon.top + icon.height / 2 - win.bottom };
    }
    if (genie.get() === target) {
      setAnimating(false);
      return;
    }

    setAnimating(true);
    if (!hidden) setStowed(false);
    const controls = animate(genie, target, { duration: hidden ? 0.62 : 0.5, ease: 'linear' });
    controls.then(() => {
      setAnimating(false);
      if (hidden) setStowed(true);
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden]);

  const clipPath = useTransform(genie, (p) => geniePath(p, aim.current.tipX));
  const x = useTransform(genie, (p) => aim.current.dx * pourAt(p));
  const y = useTransform(genie, (p) => aim.current.dy * pourAt(p));
  const scaleY = useTransform(genie, (p) => 1 - 0.96 * pourAt(p));
  const genieOpacity = useTransform(genie, (p) => 1 - clamp01((p - 0.9) / 0.1));
  const transformOrigin = useTransform(genie, () => `${aim.current.tipX}% 100%`);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggable || (e.target as HTMLElement).closest('button')) return;
    drag.current = { dx: e.clientX - rect.x, dy: e.clientY - rect.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || !rect || !onMove) return;
    const x = Math.min(Math.max(e.clientX - drag.current.dx, 0), window.innerWidth - 120);
    const y = Math.min(Math.max(e.clientY - drag.current.dy, BAR_H), window.innerHeight - 48);
    onMove({ ...rect, x, y });
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const onResizeDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!rect) return;
    e.stopPropagation();
    resize.current = { x: e.clientX, y: e.clientY, w: rect.w, h: rect.h };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!resize.current || !rect || !onMove) return;
    const w = Math.min(Math.max(resize.current.w + e.clientX - resize.current.x, 340), window.innerWidth - rect.x - 8);
    const h = Math.min(Math.max(resize.current.h + e.clientY - resize.current.y, 240), window.innerHeight - rect.y - 8);
    onMove({ ...rect, w, h });
  };
  const onResizeUp = () => {
    resize.current = null;
  };

  const style: CSSProperties = placement ?? (rect ? { left: rect.x, top: rect.y, width: rect.w, height: rect.h } : {});

  return (
    // Outer layer: where the window sits, plus the open/close animation.
    <motion.div
      ref={wrapRef}
      initial={false}
      animate={{ opacity: 1, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
      className="absolute"
      style={{ ...style, zIndex: z, display: stowed ? 'none' : 'block', pointerEvents: hidden ? 'none' : undefined }}
    >
      {/* Inner layer: the window itself, which the genie effect pinches and pours into the Dock. */}
      <motion.section
        aria-label={title}
        aria-hidden={hidden || undefined}
        onPointerDownCapture={onFocus}
        className={`os-window h-full w-full overflow-hidden rounded-[11px] ${active ? 'os-window--active' : ''}`}
        style={{
          background,
          ...(animating ? { willChange: 'transform, clip-path, opacity' } : GLASS),
          // Focused: a soft glow in the border's colour. Unfocused: just a shadow.
          boxShadow: animating
            ? 'none'
            : active
              ? '0 18px 50px rgba(0,0,0,0.5), 0 0 28px rgba(210,126,153,0.16)'
              : '0 10px 26px rgba(0,0,0,0.35)',
          clipPath,
          x,
          y,
          scaleY,
          opacity: genieOpacity,
          transformOrigin,
        }}
      >
        <div className="flex h-full flex-col">
          {/* Title bar, hyprbars-style: a tag and the window's name on the left, text buttons on the right. */}
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onDoubleClick={(e) => !(e.target as HTMLElement).closest('button') && onZoom?.()}
            className="relative flex h-8 shrink-0 items-center justify-between gap-3 pl-3 pr-2 text-[12px]"
            style={{ fontFamily: MONO, touchAction: 'none', borderBottom: '1px dashed rgba(220,215,186,0.12)' }}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: active ? OS.pink : OS.tileHi }} aria-hidden />
              <span className="truncate" style={{ color: active ? OS.text : OS.muted }}>
                {title.toLowerCase().replace(/\s+/g, '-')}
              </span>
              {subtitle && <span className="hidden truncate sm:inline" style={{ color: OS.muted }}>· {subtitle}</span>}
            </span>
            <span className="flex shrink-0 items-center gap-0.5">
              <BarButton label={`Minimise ${title}`} onClick={onMinimize} hover={OS.yellow}>_</BarButton>
              <BarButton label={`Zoom ${title}`} onClick={onZoom} hover={OS.green}>□</BarButton>
              <BarButton label={`Close ${title}`} onClick={onClose} hover={OS.red}>x</BarButton>
            </span>
          </div>
          <div className="min-h-0 flex-1">{children}</div>
        </div>
        {draggable && (
          <div
            role="separator"
            aria-label={`Resize ${title}`}
            onPointerDown={onResizeDown}
            onPointerMove={onResizeMove}
            onPointerUp={onResizeUp}
            className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize"
            style={{ touchAction: 'none' }}
          />
        )}
      </motion.section>
    </motion.div>
  );
}

/** A title-bar control drawn as bracketed text, like a TUI: [_] [□] [x]. Hidden when the window can't do it. */
function BarButton({ label, onClick, hover, children }: { label: string; onClick?: () => void; hover: string; children: ReactNode }) {
  if (!onClick) return null;
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="rounded px-1 py-0.5 leading-none text-[#727169] transition-colors hover:bg-white/5 hover:text-[var(--hover)] focus-visible:text-[var(--hover)]"
      style={{ ['--hover' as string]: hover }}
    >
      [{children}]
    </button>
  );
}
