'use client';

import { useClock } from './menu-bar';
import { DISPLAY, OS, SERIF } from './theme';

const KANJI_DAYS = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
const pad = (n: number) => String(n).padStart(2, '0');

/** Big clock that sits on the wallpaper, set like a Japanese calendar: kanji weekday running vertically. */
export function ClockWidget({ mobile }: { mobile: boolean }) {
  const now = useClock();
  const date = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute z-[3] flex items-start gap-4 ${mobile ? 'left-1/2 top-[84px] -translate-x-1/2' : 'left-12 top-[72px]'}`}
      style={{ color: OS.text, textShadow: '0 2px 18px rgba(22,22,29,0.6)' }}
    >
      <span className="mt-3 text-[15px] tracking-[0.25em]" style={{ writingMode: 'vertical-rl', color: OS.seal, fontFamily: SERIF, fontWeight: 700 }}>
        {KANJI_DAYS[now.getDay()]}
      </span>
      <div className="flex flex-col">
        <span className={`leading-none tracking-tight tabular-nums ${mobile ? 'text-[68px]' : 'text-[104px]'}`} style={{ fontFamily: DISPLAY, fontWeight: 600 }}>
          {pad(now.getHours())}:{pad(now.getMinutes())}
        </span>
        <span className="mt-2 text-[17px] font-medium" style={{ color: OS.dim }}>{date}</span>
        <span className="mt-2 text-[13px]" style={{ color: OS.dim }}>
          ayush is building backends at botivate
        </span>
      </div>
    </div>
  );
}
