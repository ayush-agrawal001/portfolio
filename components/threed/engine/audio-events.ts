/** Hysteresis stops a held scroll position from repeating an effect every frame. */
export function createAudioCues() {
  const active = new Map<string, boolean>();
  return (id: string, amount: number, threshold = 0.65) => {
    const was = active.get(id) ?? false;
    const on = was ? amount > threshold * 0.45 : amount >= threshold;
    active.set(id, on);
    return on && !was;
  };
}
