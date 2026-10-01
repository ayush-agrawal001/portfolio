'use client';

import { useReducedMotion } from 'framer-motion';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Pet, PET_H, PET_SHOULDER, PET_W } from './pet';
import { OS, PIXEL } from './theme';

export const TOUR_KEY = 'ayush-os-tour-v1';

/** `perch`: seat the pet on top of the target instead of beside it (for things in the Dock, which has neighbours). */
type Step = { target?: string; title: string; body: string; perch?: boolean };

const STEPS: Step[] = [
  {
    title: 'Hi, I’m Mochi',
    body: 'I live on Ayush’s desktop. This portfolio is a tiny Linux desktop you can click around in. Want a 20-second tour? I’ll point things out.',
  },
  {
    target: '[data-tour="dock"]',
    perch: true,
    title: 'Apps live in the Dock',
    body: 'Click any icon under my paw to open it. Projects shows what Ayush has built, Terminal is for the command-line curious, and Résumé is the classic version.',
  },
  {
    target: '[data-tour="ask-icon"]',
    perch: true,
    title: 'New: Ask Ayush',
    body: 'My favourite. An AI that answers anything about Ayush’s work, using only his real résumé and repos. Easiest place to start.',
  },
  {
    target: '[data-tour="menu"]',
    title: 'The app menu',
    body: 'This brush circle opens every app, plus quick links and what Ayush is shipping. You can also type a question in its search box.',
  },
  {
    target: '[data-tour="clock"]',
    title: 'Control center',
    body: 'Tap the clock for notifications, quick toggles and a hint or two about hiring Ayush.',
  },
  {
    target: '[data-tour="help"]',
    title: 'Lost? Call me back',
    body: 'Help in the menu bar brings me and this tour back any time. A window’s red button closes it, yellow tucks it into the Dock, and Esc closes panels.',
  },
];

type Rect = { top: number; left: number; width: number; height: number };
type Box = { l: number; t: number; r: number; b: number };

const PAD = 8;
const REACH = { min: 20, max: 64 };
const TYPE_MS = 16; // per character

// The dialogue box borrows the pet's own palette: parchment, with her outline and coat as the frame.
const BOX = { ink: '#3B1F0A', frame: '#5B2F0E', trim: '#DE8E32', paper: '#F6E0B0', shade: '#E7CB8F', deep: '#2E1707', focus: '#5C6FD6' };
/** A rectangle with one sprite pixel nipped off each corner. */
const PIXEL_CORNERS =
  'polygon(0 4px, 4px 4px, 4px 0, calc(100% - 4px) 0, calc(100% - 4px) 4px, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 4px calc(100% - 4px), 0 calc(100% - 4px))';
const BTN = 'h-10 px-3 text-[15px] outline-offset-2 focus-visible:outline-2 active:translate-y-[2px]';
const clamp = (x: number, lo: number, hi: number) => Math.min(Math.max(x, lo), hi);

/** How far and which way the pet's arm goes so its paw lands on the edge of the highlight. */
function aim(sx: number, sy: number, box: Box, flip: boolean) {
  const dx = (box.l + box.r) / 2 - sx;
  const dy = (box.t + box.b) / 2 - sy;
  let t = 0;
  if (dx) {
    const tx = ((dx > 0 ? box.l : box.r) - sx) / dx;
    if (tx > t && tx < 1) t = tx;
  }
  if (dy) {
    const ty = ((dy > 0 ? box.t : box.b) - sy) / dy;
    if (ty > t && ty < 1) t = ty;
  }
  return {
    angle: (Math.atan2(-dy, flip ? dx : -dx) * 180) / Math.PI,
    reach: clamp(Math.hypot(dx, dy) * t - 5, REACH.min, REACH.max),
  };
}

export function Tour({ onFinish, onOpenAsk }: { onFinish: () => void; onOpenAsk: () => void }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [typed, setTyped] = useState(0);
  const reduce = useReducedMotion();
  const primaryRef = useRef<HTMLButtonElement>(null);
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  useLayoutEffect(() => {
    const measure = () => {
      const el = step.target ? document.querySelector(step.target) : null;
      if (!el) return setRect(null);
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [step.target]);

  useEffect(() => {
    primaryRef.current?.focus();
  }, [i]);

  // Each line is typed out, as in a game; clicking the text finishes it at once.
  const body = step.body;
  useEffect(() => {
    if (reduce) return setTyped(body.length);
    setTyped(0);
    const id = setInterval(() => setTyped((n) => Math.min(n + 1, body.length)), TYPE_MS);
    return () => clearInterval(id);
  }, [body, reduce]);
  const typing = typed < body.length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFinish();
      if (e.key === 'ArrowRight' && !last) setI((n) => n + 1);
      if (e.key === 'ArrowLeft' && i > 0) setI((n) => n - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [i, last, onFinish]);

  const next = () => (last ? onFinish() : setI(i + 1));

  // Mochi stands next to the highlighted element with her paw on it; the card is her dialogue box.
  const CARD_W = Math.min(360, typeof window !== 'undefined' ? window.innerWidth - 24 : 360);
  let cardStyle: React.CSSProperties = { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
  let pet: { left: number; top: number; flip: boolean; angle: number; reach: number } | null = null;
  if (rect && typeof window !== 'undefined') {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const ring: Box = { l: rect.left - PAD, t: rect.top - PAD, r: rect.left + rect.width + PAD, b: rect.top + rect.height + PAD };
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const clampX = (x: number) => clamp(x, 12, vw - CARD_W - 12);
    const lowerHalf = cy > vh / 2;
    let left: number;
    let top: number;
    let flip = false;
    if (!step.perch && ring.r + PET_W + CARD_W + 24 < vw) {
      // Room beside the target: target, then Mochi, then the card.
      left = ring.r + 6;
      const cardLeft = left + PET_W + 6;
      if (lowerHalf) {
        const bottom = Math.max(12, vh - rect.top - rect.height);
        top = clamp(cy - PET_SHOULDER.y, 8, vh - PET_H - 8);
        cardStyle = { left: cardLeft, bottom };
      } else {
        const cardTop = Math.max(12, rect.top);
        top = clamp(cy - PET_SHOULDER.y, 8, cardTop + 130);
        cardStyle = { left: cardLeft, top: cardTop };
      }
    } else {
      // In the Dock or on narrow screens: she perches between the card and the target.
      flip = cx + 14 + PET_W > vw - 8;
      left = flip ? Math.max(8, cx - 14 - PET_W) : cx + 14;
      if (lowerHalf) {
        top = ring.t - PET_H + 4;
        cardStyle = { left: clampX(cx - CARD_W / 2), bottom: vh - top + 4 };
      } else {
        top = ring.b + 4;
        cardStyle = { left: clampX(rect.left), top: top + PET_H - 8 };
      }
    }
    const sx = left + (flip ? PET_W - PET_SHOULDER.x : PET_SHOULDER.x);
    pet = { left, top, flip, ...aim(sx, top + PET_SHOULDER.y, ring, flip) };
  }

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-body">
      {rect ? (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 transition-all duration-300"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: '0 0 0 9999px rgba(22,22,29,0.8)',
            ['--tw-ring-color' as string]: OS.accent,
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[rgba(22,22,29,0.8)]" />
      )}

      <div
        className="absolute flex flex-col gap-2.5 px-6 pb-5 pt-5"
        style={{ ...cardStyle, width: CARD_W, color: BOX.ink, fontFamily: PIXEL, filter: 'drop-shadow(6px 6px 0 rgba(0,0,0,0.4))' }}
      >
        {/* pixel frame: outline, coat-coloured trim, parchment */}
        <div aria-hidden className="absolute inset-0" style={{ background: BOX.frame, clipPath: PIXEL_CORNERS }} />
        <div aria-hidden className="absolute inset-1" style={{ background: BOX.trim, clipPath: PIXEL_CORNERS }} />
        <div aria-hidden className="absolute inset-2" style={{ background: BOX.paper, clipPath: PIXEL_CORNERS }} />

        {!pet && (
          <div className="pointer-events-none absolute left-5" style={{ top: 8 - PET_H }}>
            <Pet angle={62} reach={26} wave />
          </div>
        )}

        <div className="relative flex items-center justify-between">
          <span className="px-2 py-0.5 text-[13px] font-bold uppercase tracking-[0.12em]" style={{ background: BOX.frame, color: BOX.paper }}>
            Mochi
          </span>
          <span className="flex items-center gap-1.5 text-[13px]" style={{ color: BOX.frame }}>
            <span className="sr-only">{i === 0 ? 'Quick tour' : `Step ${i} of ${STEPS.length - 1}`}</span>
            <span className="flex gap-1" aria-hidden>
              {STEPS.slice(1).map((_, n) => (
                <span key={n} className="h-2 w-2" style={{ background: n + 1 <= i ? BOX.frame : BOX.shade, boxShadow: `inset 0 0 0 1px ${BOX.frame}` }} />
              ))}
            </span>
          </span>
        </div>

        <h2 id="tour-title" className="relative text-[21px] font-bold leading-tight">{step.title}</h2>
        <p id="tour-body" className="sr-only">{body}</p>
        {/* The invisible copy reserves the box's final height, so it does not grow as the line types out. */}
        <p aria-hidden onClick={() => setTyped(body.length)} className="relative text-[16px] leading-[1.45]">
          <span className="opacity-0">{body} ▼</span>
          <span className="absolute inset-0">
            {body.slice(0, typed)}
            {!typing && <span className="ml-1.5 inline-block animate-bounce text-[12px] motion-reduce:animate-none" style={{ color: BOX.trim }}>▼</span>}
          </span>
        </p>

        <div className="relative mt-1.5 flex items-center justify-between gap-2">
          {last ? <span /> : (
            <button type="button" onClick={onFinish} className="py-2 text-[15px] underline decoration-2 underline-offset-4 outline-offset-2 focus-visible:outline-2" style={{ color: BOX.frame, outlineColor: BOX.focus }}>
              {i === 0 ? 'Skip, I’ll explore' : 'Skip tour'}
            </button>
          )}
          <div className="flex gap-2">
            {i > 0 && (
              <button type="button" onClick={() => setI(i - 1)} className={BTN} style={{ background: BOX.shade, boxShadow: `inset 0 0 0 2px ${BOX.frame}`, outlineColor: BOX.focus }}>
                Back
              </button>
            )}
            {last && (
              <button
                type="button"
                onClick={() => { onFinish(); onOpenAsk(); }}
                className={BTN}
                style={{ background: BOX.shade, boxShadow: `inset 0 0 0 2px ${BOX.frame}`, outlineColor: BOX.focus }}
              >
                Open Ask Ayush
              </button>
            )}
            <button
              ref={primaryRef}
              type="button"
              onClick={next}
              className={`${BTN} px-4 font-bold`}
              style={{ background: BOX.frame, color: BOX.paper, boxShadow: `0 3px 0 ${BOX.deep}`, outlineColor: BOX.focus }}
            >
              {i === 0 ? 'Start tour' : last ? 'Done' : 'Next ▶'}
            </button>
          </div>
        </div>
      </div>

      {pet && (
        <div className="pointer-events-none absolute transition-all duration-300" style={{ left: pet.left, top: pet.top }}>
          <Pet angle={pet.angle} reach={pet.reach} flip={pet.flip} />
        </div>
      )}
    </div>
  );
}
