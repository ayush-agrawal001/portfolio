/**
 * Kanagawa palette (https://github.com/rebelot/kanagawa.nvim), itself drawn from
 * Hokusai's "The Great Wave off Kanagawa". Shared by every app on the desktop.
 */
export const OS = {
  panel: '#1F1F28', // sumiInk1
  panelDeep: '#16161D', // sumiInk0
  card: '#2A2A37', // sumiInk2
  tile: '#363646', // sumiInk3
  tileHi: '#54546D', // sumiInk4
  text: '#DCD7BA', // fujiWhite
  dim: '#C8C093', // oldWhite
  muted: '#727169', // fujiGray
  accent: '#7E9CD8', // crystalBlue
  green: '#98BB6C', // springGreen
  red: '#E46876', // waveRed
  purple: '#957FB8', // oniViolet
  pink: '#D27E99', // sakuraPink
  cyan: '#7FB4CA', // springBlue
  yellow: '#E6C384', // carpYellow
  orange: '#FFA066', // surimiOrange
  seal: '#C34043', // autumnRed: the hanko stamp
} as const;

/**
 * The macOS system fonts. On Apple devices these resolve to the real San Francisco faces;
 * everywhere else they fall back to Inter and Geist Mono, the closest freely licensed matches
 * (Apple does not license SF for the web).
 */
export const UI = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", var(--font-inter), system-ui, sans-serif';
export const DISPLAY = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", var(--font-inter), system-ui, sans-serif';
export const MONO = '"SF Mono", SFMono-Regular, ui-monospace, Menlo, var(--font-geist-mono), monospace';
/** Pixel face for the tour pet's dialogue box. */
export const PIXEL = 'var(--font-pixel), "SF Mono", ui-monospace, monospace';
/** Mincho, kept only for kanji: the 問 seal and the weekday on the clock. */
export const SERIF = 'var(--font-mincho), "Hiragino Mincho ProN", "Yu Mincho", serif';

/** Height of the menu bar, and the strip the Dock occupies at the bottom of the screen. */
export const BAR_H = 28;
export const DOCK_SPACE = 84;

export type AppId = 'ask' | 'terminal' | 'projects' | 'music' | 'resume' | 'threed';

/** Border of the focused window: a quiet ink line, no neon. */
export const ACTIVE_BORDER = '#54546D';

/** Frosted-glass surface (macOS "vibrancy") shared by the launcher, control center and music player. */
export const GLASS = {
  backdropFilter: 'blur(28px) saturate(180%)',
  WebkitBackdropFilter: 'blur(28px) saturate(180%)',
} as const;
export const PANEL = {
  background: 'rgba(31,31,40,0.78)',
  border: '1px solid rgba(255,255,255,0.12)',
  ...GLASS,
} as const;

export type Wallpaper = { id: string; name: string; src: string; mobileSrc?: string; mobilePosition?: string };

export const WALLPAPERS: Wallpaper[] = [
  { id: 'moonlit', name: 'Samurai', src: '/wallpaper-moonlit.webp', mobilePosition: '21% center' },
  { id: 'fuji', name: 'Fuji at dusk', src: '/wallpaper-fuji.svg', mobilePosition: '65% center' },
  { id: 'sakura', name: 'Moonlit sakura', src: '/wallpaper-sakura.svg', mobilePosition: '40% center' },
  { id: 'creation', name: 'Creation (ASCII)', src: '/desktop_wallpaper.jpg', mobileSrc: '/mobile-wallpaper.png' },
];
