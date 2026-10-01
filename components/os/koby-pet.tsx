'use client';

import { useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';

/**
 * Koby as a small character. public/koby-sprites.webp is a 4 x 4 sheet of poses, each standing
 * on the bottom centre of its cell; these are the [row, column] of the ones used.
 */
const FRAMES = {
  relaxed: [0, 1],
  lean: [0, 2],
  talk: [0, 3],
  explain: [1, 0],
  wave: [1, 1],
  think: [1, 2],
  ponder: [1, 3],
  armsCrossed: [3, 0],
} as const;

type Frame = keyof typeof FRAMES;

/** What Koby is doing. A pose with several frames is a little animation; `ms` is how long each frame shows. */
const POSES = {
  idle: { frames: ['relaxed'], ms: 0 },
  wave: { frames: ['wave', 'relaxed'], ms: 650 },
  listen: { frames: ['lean'], ms: 0 },
  think: { frames: ['think', 'ponder'], ms: 1100 },
  talk: { frames: ['talk', 'relaxed', 'explain', 'relaxed'], ms: 420 },
  shrug: { frames: ['explain'], ms: 0 },
  proud: { frames: ['armsCrossed'], ms: 0 },
} satisfies Record<string, { frames: Frame[]; ms: number }>;

export type KobyPose = keyof typeof POSES;

/** `size` is the height in px. The box is narrower than the sprite cell, so text can sit close to him. */
export function KobyPet({ pose, size = 88 }: { pose: KobyPose; size?: number }) {
  const reduce = useReducedMotion();
  const { frames, ms } = POSES[pose];
  const [step, setStep] = useState(0);

  useEffect(() => {
    setStep(0);
    if (reduce || frames.length < 2) return;
    const id = setInterval(() => setStep((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [pose, reduce, frames.length, ms]);

  const [row, col] = FRAMES[frames[step % frames.length]];
  return (
    <span className="relative inline-block shrink-0" style={{ width: size * 0.72, height: size }} aria-hidden>
      <span
        className="absolute left-1/2 top-0 -translate-x-1/2"
        style={{
          width: size,
          height: size,
          backgroundImage: 'url(/koby-sprites.webp)',
          backgroundSize: '400% 400%',
          backgroundPosition: `${(col * 100) / 3}% ${(row * 100) / 3}%`,
          backgroundRepeat: 'no-repeat',
        }}
      />
    </span>
  );
}
