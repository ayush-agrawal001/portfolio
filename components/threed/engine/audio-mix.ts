export const MUSIC_START = 10;

export type AudioParams = {
  f: number; scrollV: number; seam: number; flash: number; fly: number;
  speed: number; footer: number; modal: boolean;
};

const clamp = (x: number) => Math.max(0, Math.min(1, x));

/** Motion only takes energy away from the music; quiet air fills the space it leaves. */
export function soundMix(p: AudioParams) {
  const travel = Math.max(clamp(p.fly), clamp(p.seam), clamp(p.speed / 90), clamp(p.scrollV));
  const space = Math.max(1 - clamp(p.f / 0.7), clamp((p.f - 3.1) / 0.7)) * (1 - clamp(p.footer));
  const hush = Math.max(travel, space);
  const motion = Math.max(clamp(p.speed / 110), clamp(p.scrollV));
  const duck = p.modal ? 0.3 : 1;
  return {
    music: (0.20 - 0.135 * hush) * duck,
    wind: (0.014 + 0.008 * space + 0.055 * motion) * duck,
    air: 0.006 * duck,
    cutoff: 460 + 1240 * motion,
  };
}
