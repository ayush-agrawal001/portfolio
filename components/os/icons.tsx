import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };

const stroke = (size: number, rest: SVGProps<SVGSVGElement>) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...rest,
});

/** Ensō, the zen brush circle: the app-menu button. */
export const EnsoIcon = ({ size = 22, ...rest }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" aria-hidden {...rest}>
    <path d="M16.8 4.6A8.4 8.4 0 1 0 20.2 9.6" strokeWidth={2.6} />
    <path d="M20.2 9.6c.2.8.3 1.6.2 2.4" strokeWidth={1.4} opacity={0.7} />
  </svg>
);

export const StarIcon = ({ size = 20, ...rest }: P) => (
  <svg width={size} height={size} viewBox="0 0 34 34" fill="currentColor" aria-hidden {...rest}>
    <path d="M17 3l3.9 8.6 9.4 1-7 6.3 2 9.2L17 23.4 8.7 28.1l2-9.2-7-6.3 9.4-1z" />
  </svg>
);

/** A red hanko (seal stamp) with 問, "to ask": the mark of the Ask Ayush app. */
export const AskBadge = ({ size = 44, round = true }: { size?: number; round?: boolean }) => (
  <span
    className={`flex shrink-0 items-center justify-center ${round ? 'rounded-full' : 'rounded-[6px]'}`}
    style={{
      width: size,
      height: size,
      background: '#C34043',
      color: '#F2ECD6',
      fontFamily: 'var(--font-mincho), serif',
      fontSize: size * 0.52,
      fontWeight: 700,
      lineHeight: 1,
      boxShadow: 'inset 0 0 0 2px rgba(242,236,214,0.18)',
    }}
    aria-hidden
  >
    問
  </span>
);

export const WifiIcon = ({ size = 16, ...rest }: P) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden {...rest}>
    <path d="M8 14L0 4.5a12.6 12.6 0 0 1 16 0z" />
  </svg>
);
export const BluetoothIcon = ({ size = 16, ...rest }: P) => (
  <svg {...stroke(size, rest)}><path d="M7 7l10 10-5 5V2l5 5L7 17" /></svg>
);
export const DndIcon = ({ size = 18, ...rest }: P) => (
  <svg {...stroke(size, rest)} strokeWidth={0} fill="currentColor">
    <path fillRule="evenodd" d="M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM7 10.8h10v2.4H7z" />
  </svg>
);
export const MicIcon = ({ size = 16, ...rest }: P) => (
  <svg {...stroke(size, rest)}>
    <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
  </svg>
);
export const RecordIcon = ({ size = 18, ...rest }: P) => (
  <svg {...stroke(size, rest)} strokeWidth={0} fill="currentColor">
    <path fillRule="evenodd" d="M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zm0 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
  </svg>
);
export const FullscreenIcon = ({ size = 16, ...rest }: P) => (
  <svg {...stroke(size, rest)}><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" /></svg>
);
export const PowerIcon = ({ size = 18, ...rest }: P) => (
  <svg {...stroke(size, rest)}><path d="M12 3v8" /><path d="M6.3 6.3a8 8 0 1 0 11.4 0" /></svg>
);
export const RestartIcon = ({ size = 18, ...rest }: P) => (
  <svg {...stroke(size, rest)}><path d="M4 12a8 8 0 1 0 2.3-5.7" /><path d="M4 4v4h4" /></svg>
);
export const LockIcon = ({ size = 18, ...rest }: P) => (
  <svg {...stroke(size, rest)}><rect x="5" y="10" width="14" height="11" rx="2" fill="currentColor" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
);
export const CodeIcon = ({ size = 16, ...rest }: P) => (
  <svg {...stroke(size, rest)}><path d="M8 7l-5 5 5 5M16 7l5 5-5 5" /></svg>
);
export const GlobeIcon = ({ size = 16, ...rest }: P) => (
  <svg {...stroke(size, rest)}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></svg>
);
export const MailIcon = ({ size = 16, ...rest }: P) => (
  <svg {...stroke(size, rest)}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>
);
export const DocIcon = ({ size = 16, ...rest }: P) => (
  <svg {...stroke(size, rest)}><path d="M6 3h9l4 4v14H6z" /><path d="M9 12h7M9 16h5" /></svg>
);
export const CloseIcon = ({ size = 12, ...rest }: P) => (
  <svg {...stroke(size, rest)}><path d="M6 6l12 12M18 6L6 18" /></svg>
);
export const ClearAllIcon = ({ size = 18, ...rest }: P) => (
  <svg {...stroke(size, rest)}><path d="M5 7h14M7 12h12M9 17h10" /></svg>
);
export const BellIcon = ({ size = 32, ...rest }: P) => (
  <svg {...stroke(size, rest)} strokeWidth={1.8}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a2 2 0 0 0 4 0" /></svg>
);
export const ArrowRightIcon = ({ size = 24, ...rest }: P) => (
  <svg {...stroke(size, rest)}><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /></svg>
);
export const ChevronLeftIcon = ({ size = 20, ...rest }: P) => (
  <svg {...stroke(size, rest)}><path d="M15 6l-6 6 6 6" /></svg>
);
export const ChevronRightIcon = ({ size = 20, ...rest }: P) => (
  <svg {...stroke(size, rest)}><path d="M9 6l6 6-6 6" /></svg>
);
export const PaperclipIcon = ({ size = 24, ...rest }: P) => (
  <svg {...stroke(size, rest)}><path d="M9 7v8a3 3 0 0 0 6 0V6a4.5 4.5 0 0 0-9 0v9a6 6 0 0 0 12 0V8" /></svg>
);
export const InfoIcon = ({ size = 15, ...rest }: P) => (
  <svg {...stroke(size, rest)} strokeWidth={1.8}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
);
export const ShieldIcon = ({ size = 36, ...rest }: P) => (
  <svg {...stroke(size, rest)} strokeWidth={1.8}><path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6z" /><path d="M9 12l2 2 4-4" /></svg>
);
export const TerminalIcon = ({ size = 36, ...rest }: P) => (
  <svg {...stroke(size, rest)} strokeWidth={1.8}><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M7 9l3 3-3 3M13 15h4" /></svg>
);
export const PrevIcon = ({ size = 14, ...rest }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden {...rest}><path d="M6 5h2v14H6zM20 5v14L9 12z" /></svg>
);
export const NextIcon = ({ size = 14, ...rest }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden {...rest}><path d="M16 5h2v14h-2zM4 5v14l11-7z" /></svg>
);
export const PlayIcon = ({ size = 12, ...rest }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden {...rest}><path d="M7 4l14 8-14 8z" /></svg>
);
