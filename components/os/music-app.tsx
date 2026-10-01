'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * "The Smiths: Official Music Videos", from the band's official channel (@thesmithsofficial).
 * The auto-generated "The Smiths - Topic" channel can't be embedded (label restriction), so the
 * library links out to it on YouTube Music for the full catalogue.
 */
const PLAYLIST = {
  list: 'PLFIhsqj9dojqMSmDjAf6xLl9limlz95-e',
  name: 'The Smiths',
  subtitle: 'Official music videos',
  url: 'https://music.youtube.com/channel/UCklWLf-5N7mE8S06rj2OrQw',
};

const TRACKS = [
  { id: 'cJRP3LRcUFg', title: 'This Charming Man', length: '2:43' },
  { id: 'TjPhzgxe3L0', title: 'Heaven Knows I’m Miserable Now', length: '3:35' },
  { id: 'hnpILIIo9ek', title: 'How Soon Is Now?', length: '3:36' },
  { id: 'XbOx8TyvUmI', title: 'What Difference Does It Make?', length: '3:26' },
  { id: 'zoo9Vu1a9bU', title: 'Ask', length: '2:59' },
  { id: 'wMykYSQaG_c', title: 'Panic', length: '2:13' },
  { id: 'SckD99B51IA', title: 'Stop Me If You Think You’ve Heard This One Before', length: '3:33' },
  { id: 'qdOHPjMzY8s', title: 'The Boy With The Thorn In His Side', length: '3:05' },
  { id: '3GhoWZ5qTwI', title: 'Girlfriend In A Coma', length: '2:03' },
  { id: 'lJRN76hxFz0', title: 'Shoplifters Of The World Unite', length: '2:58' },
  { id: 'q-8kKH4COvg', title: 'Sheila Take A Bow', length: '2:42' },
];

const GREEN = '#1ED760';
const BASE = '#121212';
const RAISED = '#1F1F1F';
const DIM = '#B3B3B3';
const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

/** The bits of the YouTube IFrame Player API we use (https://developers.google.com/youtube/iframe_api_reference). */
type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  nextVideo: () => void;
  previousVideo: () => void;
  playVideoAt: (index: number) => void;
  setShuffle: (on: boolean) => void;
  setVolume: (volume: number) => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getVideoUrl: () => string;
  getPlaylist: () => string[] | null;
  destroy: () => void;
};
type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      width: string;
      height: string;
      playerVars: Record<string, string | number>;
      events: {
        onReady?: (e: { target: YTPlayer }) => void;
        onStateChange?: (e: { data: number }) => void;
        onError?: (e: { data: number }) => void;
      };
    },
  ) => YTPlayer;
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const PLAYING = 1;

function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  return new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT!);
    };
    if (!document.querySelector('script[data-yt-iframe-api]')) {
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      s.dataset.ytIframeApi = '';
      document.body.appendChild(s);
    }
  });
}

const fmt = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

type Props = {
  /** Compact "mini player": just the video and transport, parked in the corner. */
  mini: boolean;
  /** True while the window is minimised into the Dock: YouTube doesn't allow a hidden player to keep playing. */
  suspended: boolean;
  onToggleMini: () => void;
};

/**
 * A music app in the familiar streaming-player layout: library, playlist, now-playing, transport bar.
 * Playback is YouTube's embedded player, which has to stay visible (at least 200 x 200 px) while it plays,
 * so the video doubles as the "now playing" artwork in both the full and the mini layout.
 */
export function MusicApp({ mini, suspended, onToggleMini }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const userPausedRef = useRef(false);
  const resumeRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [everPlayed, setEverPlayed] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(true);
  const [volume, setVolume] = useState(80);

  // Create the player once. It tries to start straight away; browsers block sound until the visitor
  // interacts, so otherwise it starts on their first click or keypress (unless they paused it).
  useEffect(() => {
    let cancelled = false;
    let started = false;

    const tryPlay = () => {
      if (!started && !userPausedRef.current) playerRef.current?.playVideo();
    };
    const onGesture = () => {
      tryPlay();
      if (started) removeGestures();
    };
    const removeGestures = () => {
      window.removeEventListener('pointerdown', onGesture, true);
      window.removeEventListener('keydown', onGesture, true);
    };
    window.addEventListener('pointerdown', onGesture, true);
    window.addEventListener('keydown', onGesture, true);

    loadYouTubeApi().then((YT) => {
      if (cancelled || !mountRef.current) return;
      const el = document.createElement('div');
      mountRef.current.appendChild(el);
      playerRef.current = new YT.Player(el, {
        width: '100%',
        height: '100%',
        // controls: 0 hides YouTube's own player bar; the app's transport drives playback instead.
        playerVars: { listType: 'playlist', list: PLAYLIST.list, autoplay: 1, playsinline: 1, rel: 0, loop: 1, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3 },
        events: {
          onReady: (e) => {
            e.target.setVolume(80);
            e.target.setShuffle(true);
            e.target.playVideoAt(0);
            tryPlay();
          },
          // A track that can't be embedded is skipped.
          onError: () => playerRef.current?.nextVideo(),
          onStateChange: (e) => {
            const isPlaying = e.data === PLAYING;
            setPlaying(isPlaying);
            try {
              const id = new URL(playerRef.current?.getVideoUrl() ?? '').searchParams.get('v');
              if (id) setCurrentId(id);
            } catch {}
            if (isPlaying) {
              started = true;
              setEverPlayed(true);
              userPausedRef.current = false;
              removeGestures();
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      removeGestures();
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, []);

  // Progress for the seek bar.
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      setTime(p.getCurrentTime() || 0);
      setDuration(p.getDuration() || 0);
    }, 500);
    return () => clearInterval(id);
  }, [playing]);

  // Minimised into the Dock: pause, and pick up again when the window comes back.
  useEffect(() => {
    if (suspended && playing) {
      resumeRef.current = true;
      playerRef.current?.pauseVideo();
    } else if (!suspended && resumeRef.current) {
      resumeRef.current = false;
      playerRef.current?.playVideo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suspended]);

  const toggle = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (playing) {
      userPausedRef.current = true;
      p.pauseVideo();
    } else {
      userPausedRef.current = false;
      p.playVideo();
    }
  }, [playing]);

  const playTrack = (id: string) => {
    const p = playerRef.current;
    if (!p) return;
    userPausedRef.current = false;
    // With shuffle on, the player's order differs from the list on screen.
    const index = (p.getPlaylist() ?? []).indexOf(id);
    if (index >= 0) p.playVideoAt(index);
  };

  const toggleShuffle = () => {
    playerRef.current?.setShuffle(!shuffle);
    setShuffle(!shuffle);
  };

  const changeVolume = (v: number) => {
    setVolume(v);
    playerRef.current?.setVolume(v);
  };

  const seek = (seconds: number) => {
    setTime(seconds);
    playerRef.current?.seekTo(seconds, true);
  };

  const current = TRACKS.find((t) => t.id === currentId) ?? null;
  const title = current?.title ?? 'Shuffling The Smiths';

  const transport = (size: 'sm' | 'lg') => (
    <div className="flex items-center justify-center gap-4">
      {size === 'lg' && (
        <IconButton label={shuffle ? 'Turn shuffle off' : 'Turn shuffle on'} onClick={toggleShuffle} pressed={shuffle} color={shuffle ? GREEN : DIM}>
          <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </IconButton>
      )}
      <IconButton label="Previous song" onClick={() => playerRef.current?.previousVideo()} color="#FFFFFF">
        <path d="M6 5h2v14H6zM20 5v14L9 12z" fill="currentColor" />
      </IconButton>
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pause' : 'Play'}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
          {playing ? <path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor" /> : <path d="M8 5l12 7-12 7z" fill="currentColor" />}
        </svg>
      </button>
      <IconButton label="Next song" onClick={() => playerRef.current?.nextVideo()} color="#FFFFFF">
        <path d="M16 5h2v14h-2zM4 5v14l11-7z" fill="currentColor" />
      </IconButton>
      {size === 'lg' && (
        <IconButton label="Switch to mini player" onClick={onToggleMini} color={DIM}>
          <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth={2} />
          <rect x="12" y="11" width="7" height="6" rx="1" fill="currentColor" />
        </IconButton>
      )}
    </div>
  );

  return (
    <div className={`flex h-full min-h-0 flex-col text-white ${mini ? '' : 'gap-2 bg-black p-2'}`} style={{ fontFamily: 'inherit' }}>
      <div className={`flex min-h-0 flex-1 ${mini ? 'flex-col' : 'gap-2'}`}>
        {!mini && (
          <aside className="hidden w-[210px] shrink-0 flex-col gap-3 rounded-lg p-3 md:flex" style={{ background: BASE }}>
            <span className="px-1 text-sm font-bold" style={{ color: DIM }}>Your Library</span>
            <div className="flex items-center gap-3 rounded-md p-2" style={{ background: RAISED }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb(TRACKS[2].id)} alt="" className="h-11 w-11 rounded object-cover" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-semibold" style={{ color: GREEN }}>{PLAYLIST.name}</span>
                <span className="truncate text-xs" style={{ color: DIM }}>Playlist · {TRACKS.length} songs</span>
              </span>
            </div>
            <a href={PLAYLIST.url} target="_blank" rel="noreferrer" className="mt-auto rounded-md px-2 py-2 text-xs hover:bg-white/5" style={{ color: DIM }}>
              Full catalogue on YouTube Music ↗
            </a>
          </aside>
        )}

        {!mini && (
          <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg" style={{ background: 'linear-gradient(180deg, #3C4A5E 0px, #121212 260px)' }}>
            <div className="flex shrink-0 items-end gap-5 px-6 pb-5 pt-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumb(TRACKS[2].id)} alt="" className="hidden h-[120px] w-[120px] rounded object-cover shadow-[0_8px_30px_rgba(0,0,0,0.5)] sm:block" />
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="text-xs font-semibold">Playlist</span>
                <h1 className="text-[36px] font-black leading-none tracking-tight lg:text-[46px]">{PLAYLIST.name}</h1>
                <span className="text-sm" style={{ color: DIM }}>{PLAYLIST.subtitle} · {TRACKS.length} songs</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-5 px-6 pb-3">
              <button
                type="button"
                onClick={toggle}
                aria-label={playing ? 'Pause' : 'Play'}
                className="flex h-12 w-12 items-center justify-center rounded-full text-black transition-transform hover:scale-105"
                style={{ background: GREEN }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
                  {playing ? <path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor" /> : <path d="M8 5l12 7-12 7z" fill="currentColor" />}
                </svg>
              </button>
              {!everPlayed && <span className="text-xs" style={{ color: DIM }}>Click anywhere to start the music</span>}
            </div>
            <ol className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
              {TRACKS.map((t, i) => {
                const active = t.id === currentId;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => playTrack(t.id)}
                      aria-current={active || undefined}
                      className="flex w-full items-center gap-4 rounded-md px-3 py-2 text-left text-sm hover:bg-white/10"
                    >
                      <span className="w-5 shrink-0 text-right tabular-nums" style={{ color: active ? GREEN : DIM }}>
                        {active && playing ? '♪' : i + 1}
                      </span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={thumb(t.id)} alt="" loading="lazy" className="h-10 w-10 shrink-0 rounded object-cover" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate font-medium" style={{ color: active ? GREEN : '#FFFFFF' }}>{t.title}</span>
                        <span className="truncate text-xs" style={{ color: DIM }}>{PLAYLIST.name}</span>
                      </span>
                      <span className="shrink-0 tabular-nums" style={{ color: DIM }}>{t.length}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </main>
        )}

        {/* Now playing: the YouTube player itself, always visible and unobstructed while it plays. */}
        <aside
          key="now-playing"
          className={`flex shrink-0 flex-col ${mini ? 'gap-2 p-3' : 'w-[256px] gap-3 rounded-lg p-3'}`}
          style={{ background: mini ? 'transparent' : BASE }}
        >
          {!mini && <span className="text-sm font-bold">Now playing</span>}
          <div ref={mountRef} className="overflow-hidden rounded-md bg-black" style={mini ? { width: 200, height: 200 } : { width: 232, height: 232 }} />
          <div className="flex min-w-0 flex-col">
            <span className={`truncate font-semibold ${mini ? 'text-[13px]' : 'text-base'}`}>{title}</span>
            <span className="truncate text-xs" style={{ color: DIM }}>{PLAYLIST.name}</span>
          </div>
          {mini && (
            <>
              {transport('sm')}
              {!everPlayed && <span className="text-center text-[10px]" style={{ color: DIM }}>click anywhere to start the music</span>}
            </>
          )}
        </aside>
      </div>

      {!mini && (
        <footer className="flex h-[68px] shrink-0 items-center gap-4 px-2">
          <div className="hidden w-[210px] min-w-0 items-center gap-3 md:flex">
            {current && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb(current.id)} alt="" className="h-11 w-11 rounded object-cover" />
            )}
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">{title}</span>
              <span className="truncate text-xs" style={{ color: DIM }}>{PLAYLIST.name}</span>
            </span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            {transport('lg')}
            <div className="flex w-full max-w-[520px] items-center gap-2 text-[11px] tabular-nums" style={{ color: DIM }}>
              <span className="w-8 text-right">{fmt(time)}</span>
              <input
                type="range"
                aria-label="Seek"
                min={0}
                max={Math.max(1, Math.floor(duration))}
                value={Math.min(Math.floor(time), Math.max(1, Math.floor(duration)))}
                onChange={(e) => seek(Number(e.target.value))}
                className="h-1 flex-1 cursor-pointer"
                style={{ accentColor: GREEN }}
              />
              <span className="w-8">{duration ? fmt(duration) : current?.length ?? '0:00'}</span>
            </div>
          </div>
          <div className="hidden w-[256px] items-center justify-end gap-2 lg:flex">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={DIM} strokeWidth={2} strokeLinecap="round" aria-hidden>
              <path d="M11 5L6 9H2v6h4l5 4z" fill={DIM} stroke="none" />
              <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            </svg>
            <input
              type="range"
              aria-label="Volume"
              min={0}
              max={100}
              value={volume}
              onChange={(e) => changeVolume(Number(e.target.value))}
              className="h-1 w-28 cursor-pointer"
              style={{ accentColor: GREEN }}
            />
          </div>
        </footer>
      )}
    </div>
  );
}

function IconButton({ label, onClick, color, pressed, children }: { label: string; onClick: () => void; color: string; pressed?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-full transition-opacity hover:opacity-80"
      style={{ color }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>{children}</svg>
    </button>
  );
}
