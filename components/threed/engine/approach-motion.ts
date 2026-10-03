/** Limit large scroll jumps through the approach without adding a long delay elsewhere. */
export function paceApproach(previous: number, next: number, landing: number, dt: number) {
  const start = 3, end = landing + 1;
  const step = Math.max(0, dt) * 1.65;
  if (next > previous && next > start && previous < end) return Math.min(next, Math.max(previous, start) + step);
  if (next < previous && next < end && previous > start) return Math.max(next, Math.min(previous, end) - step);
  return next;
}
