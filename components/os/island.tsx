'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { BAR_H, OS } from './theme';

const TICKER = [
  'backend intern @ botivate',
  'cs @ bits pilani, class of ’27',
  'ex-swe intern @ trench',
  'shipping rust on solana',
  'ask me anything →',
];

/** The notch: a black pill hanging from the middle of the menu bar, carrying the status ticker. */
export function Island({ onClick, active }: { onClick: () => void; active: boolean }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % TICKER.length), 4200);
    return () => clearInterval(id);
  }, []);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open control center"
      aria-expanded={active}
      className="absolute left-1/2 top-0 z-[61] hidden -translate-x-1/2 items-center gap-3 rounded-b-[14px] bg-black px-4 text-[12px] lg:flex"
      style={{ height: BAR_H + 2, color: OS.text }}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:animate-none" style={{ background: OS.green }} />
        <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: OS.green }} />
      </span>
      <span style={{ color: OS.green }}>open to work</span>
      <span className="h-3.5 w-px" style={{ background: OS.tileHi }} />
      <span className="relative block h-4 w-[210px] overflow-hidden text-left">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={i}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ duration: 0.28 }}
            className="absolute inset-0 truncate"
            style={{ color: OS.dim }}
          >
            {TICKER[i]}
          </motion.span>
        </AnimatePresence>
      </span>
    </button>
  );
}
