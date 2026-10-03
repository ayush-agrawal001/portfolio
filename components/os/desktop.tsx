'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { CliTerminal } from '@/components/cli-terminal';
import { AskApp, type AskRequest } from './ask-app';
import { ClockWidget } from './clock-widget';
import { ControlCenter } from './control-center';
import { Dock } from './dock';
import { Island } from './island';
import { Launcher } from './launcher';
import { MenuBar } from './menu-bar';
import { MusicApp } from './music-app';
import { ProjectsApp } from './projects-app';
import { Tour, TOUR_KEY } from './tour';
import { BAR_H, DOCK_SPACE, OS, UI, WALLPAPERS, type AppId } from './theme';
import { WindowFrame, type Rect } from './window-frame';

const TITLES: Record<AppId, string> = { ask: 'Ask Ayush', terminal: 'Terminal', projects: 'Projects', music: 'The Smiths', resume: 'Résumé', threed: '3D Portfolio' };
const NONE: Record<AppId, boolean> = { ask: false, terminal: false, projects: false, music: false, resume: false, threed: false };
// v2: the samurai wallpaper became the default, so earlier saved picks are dropped.
const WALLPAPER_KEY = 'ayush-os-wallpaper-v2';

function useIsMobile() {
  const [mobile, setMobile] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return mobile;
}

function defaultRects(): Record<AppId, Rect> {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // Windows live between the menu bar and the Dock.
  const top = BAR_H + 12;
  const room = vh - top - DOCK_SPACE;
  const tw = Math.min(680, vw - 480);
  const th = Math.min(460, Math.round(vh * 0.52), room);
  const pw = Math.min(820, vw - 120);
  const ph = Math.min(480, room);
  // Ask Ayush opens centred, leaving the bottom-right corner free for the music player.
  const space = vw - 240;
  const aw = Math.min(900, space - 24);
  const ah = Math.min(760, room);
  return {
    threed: { x: 20, y: top, w: Math.max(280, vw - 40), h: room },
    terminal: { x: Math.max(420, Math.round(vw * 0.3)), y: vh - DOCK_SPACE - th, w: Math.max(tw, 460), h: th },
    projects: { x: Math.round((vw - pw) / 2), y: top + Math.round((room - ph) / 2), w: pw, h: ph },
    ask: { x: Math.max(12, Math.round((space - aw) / 2)), y: top, w: aw, h: ah },
    resume: (() => {
      const rw = Math.min(980, vw - 80);
      const rh = Math.min(820, room);
      return { x: Math.round((vw - rw) / 2), y: top + Math.round((room - rh) / 2), w: rw, h: rh };
    })(),
    music: (() => {
      const mw = Math.min(960, vw - 80);
      const mh = Math.min(600, room);
      return { x: Math.round((vw - mw) / 2), y: top + Math.round((room - mh) / 2), w: mw, h: mh };
    })(),
  };
}

export function Desktop({ asciiArt }: { asciiArt: string }) {
  const mobile = useIsMobile();
  const [open, setOpen] = useState<Record<AppId, boolean>>(NONE);
  const [minimized, setMinimized] = useState<Record<AppId, boolean>>(NONE);
  const [zoomed, setZoomed] = useState<Record<AppId, boolean>>(NONE);
  const [order, setOrder] = useState<AppId[]>(['music', 'terminal', 'projects', 'resume', 'threed', 'ask']);
  // The Music app starts as a mini player in the corner; its Dock icon opens the full window.
  const [musicMini, setMusicMini] = useState(true);
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [ccOpen, setCCOpen] = useState(false);
  const [rects, setRects] = useState<Record<AppId, Rect> | null>(null);
  const [askRequest, setAskRequest] = useState<AskRequest>(null);
  const [touring, setTouring] = useState(false);
  const [askSeen, setAskSeen] = useState(false);
  const [wallpaperId, setWallpaperId] = useState(WALLPAPERS[0].id);

  // Start on a clean desktop; first-time visitors get the tour.
  useEffect(() => {
    if (mobile === null) return;
    setRects(defaultRects());
    // On desktop the mini player is there from the start, so the song can begin on the first click.
    setOpen((o) => ({ ...o, music: !mobile }));
    try {
      if (!localStorage.getItem(TOUR_KEY)) setTouring(true);
      const saved = localStorage.getItem(WALLPAPER_KEY);
      if (saved && WALLPAPERS.some((w) => w.id === saved)) setWallpaperId(saved);
    } catch {
      setTouring(true);
    }
  }, [mobile]);

  // Keep floating windows on screen when the browser window is resized.
  useEffect(() => {
    const clamp = () =>
      setRects((all) => {
        if (!all) return all;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const next = { ...all };
        (Object.keys(next) as AppId[]).forEach((id) => {
          const r = next[id];
          const w = Math.min(r.w, vw - 16);
          const h = Math.min(r.h, vh - BAR_H - 16);
          next[id] = { w, h, x: Math.min(Math.max(r.x, 8), Math.max(8, vw - w - 8)), y: Math.min(Math.max(r.y, BAR_H), Math.max(BAR_H, vh - h - 8)) };
        });
        return next;
      });
    window.addEventListener('resize', clamp);
    return () => window.removeEventListener('resize', clamp);
  }, []);

  const finishTour = useCallback(() => {
    setTouring(false);
    try {
      localStorage.setItem(TOUR_KEY, '1');
    } catch {}
  }, []);

  const chooseWallpaper = (id: string) => {
    setWallpaperId(id);
    try {
      localStorage.setItem(WALLPAPER_KEY, id);
    } catch {}
  };

  const startTour = () => {
    setLauncherOpen(false);
    setCCOpen(false);
    setTouring(true);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[aria-modal="true"]')) {
        setLauncherOpen(false);
        setCCOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const focus = useCallback((app: AppId) => setOrder((o) => (o[o.length - 1] === app ? o : [...o.filter((a) => a !== app), app])), []);

  const openApp = useCallback(
    (app: AppId) => {
      setOpen((o) => ({ ...o, [app]: true }));
      setMinimized((m) => ({ ...m, [app]: false }));
      focus(app);
      setLauncherOpen(false);
      if (app === 'ask' || mobile) setCCOpen(false);
      if (app === 'ask') setAskSeen(true);
      if (app === 'music') setMusicMini(false);
      if (app === 'threed') setZoomed((z) => ({ ...z, threed: true }));
    },
    [focus, mobile],
  );

  const askAyush = useCallback(
    (question?: string) => {
      openApp('ask');
      if (question) setAskRequest({ question, id: Date.now() });
    },
    [openApp],
  );

  const close = (app: AppId) => {
    setOpen((o) => ({ ...o, [app]: false }));
    setMinimized((m) => ({ ...m, [app]: false }));
    setZoomed((m) => ({ ...m, [app]: false }));
  };
  const minimize = (app: AppId) => setMinimized((m) => ({ ...m, [app]: true }));
  const zoom = (app: AppId) => setZoomed((m) => ({ ...m, [app]: !m[app] }));

  if (mobile === null || !rects) return <div className="h-dvh w-screen" style={{ background: OS.panel }} />;

  const wallpaper = WALLPAPERS.find((w) => w.id === wallpaperId) ?? WALLPAPERS[0];
  const miniMusic = musicMini && !mobile;
  // The mini player floats while playing; it pauses behind the immersive 3D app.
  const z = (app: AppId) => (app === 'music' && miniMusic && !(open.threed && !minimized.threed) ? 56 : 10 + order.indexOf(app));
  const visible = (app: AppId) => open[app] && !minimized[app];
  const activeApp = [...order].reverse().find((a) => visible(a) && !(a === 'music' && miniMusic));
  const nothingOpen = !activeApp;
  const fullArea: CSSProperties = { left: 8, top: BAR_H + 6, right: 8, bottom: DOCK_SPACE };
  const miniArea: CSSProperties = { right: ccOpen ? 400 : 16, bottom: DOCK_SPACE + 4, width: 226, height: 372 };
  // Shared by every window: fills the work area on phones or when zoomed, and wires the traffic lights.
  const frame = (app: AppId) => ({
    title: TITLES[app],
    dockId: app,
    z: z(app),
    active: activeApp === app,
    hidden: minimized[app],
    placement: mobile || zoomed[app] ? fullArea : app === 'music' && miniMusic ? miniArea : undefined,
    rect: rects[app],
    onMove: (r: Rect) => setRects((s) => (s ? { ...s, [app]: r } : s)),
    onFocus: () => focus(app),
    onClose: () => close(app),
    onMinimize: mobile ? undefined : () => minimize(app),
    // Music's green light swaps between the mini player and the full app.
    onZoom: mobile ? undefined : app === 'music' ? () => setMusicMini((m) => !m) : () => zoom(app),
  });
  return (
    <div className="relative h-dvh w-screen overflow-hidden select-none" style={{ fontFamily: UI, background: OS.card, color: OS.text }}>
      <AnimatePresence initial={false}>
        <motion.img
          key={wallpaper.id}
          src={mobile && wallpaper.mobileSrc ? wallpaper.mobileSrc : wallpaper.src}
          alt=""
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: mobile ? wallpaper.mobilePosition ?? 'center' : 'center' }}
        />
      </AnimatePresence>
      <div className="pointer-events-none absolute inset-0 bg-[rgba(22,22,29,0.18)]" />
      {/* paper grain, so the flat colours feel printed rather than rendered */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[2] opacity-[0.07] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {nothingOpen && !launcherOpen && <ClockWidget mobile={mobile} />}

      {!touring && !launcherOpen && !ccOpen && nothingOpen && (
        <p
          className="pointer-events-none absolute left-1/2 z-[4] -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-2 text-[12px]"
          style={{ bottom: DOCK_SPACE + 52, background: 'rgba(31,31,40,0.7)', color: OS.dim, border: '1px solid rgba(255,255,255,0.12)', backdropFilter: 'blur(20px)' }}
        >
          {mobile ? 'Tap an app in the Dock to open it' : 'Click an app in the Dock to open it'}
        </p>
      )}

      <AnimatePresence>
        {open.terminal && (
          <WindowFrame key="terminal" {...frame('terminal')} subtitle="guest@ayush — zsh" background="rgba(14,16,27,0.84)">
            <div className="h-full select-text">
              <CliTerminal asciiArt={asciiArt} portraitSrc="/ayush-ascii.png" onExit={() => close('terminal')} onAsk={(q) => askAyush(q)} />
            </div>
          </WindowFrame>
        )}

        {open.projects && (
          <WindowFrame key="projects" {...frame('projects')} background="rgba(19,22,36,0.86)">
            <ProjectsApp onPick={(q) => askAyush(q)} />
          </WindowFrame>
        )}

        {open.music && (
          <WindowFrame key="music" {...frame('music')} background="rgba(18,18,18,0.92)">
            <MusicApp mini={miniMusic} suspended={minimized.music || visible('threed')} onToggleMini={() => setMusicMini((m) => !m)} />
          </WindowFrame>
        )}

        {open.resume && (
          <WindowFrame key="resume" {...frame('resume')} background="#05060D">
            {/* The résumé is its own page (/portfolio), shown here in a window instead of leaving the desktop. */}
            <iframe src="/portfolio" title="Ayush Agrawal's résumé" className="h-full w-full border-0" style={{ background: '#05060D' }} />
          </WindowFrame>
        )}

        {open.threed && (
          <WindowFrame key="threed" {...frame('threed')} subtitle="One Thread" background="#07070b">
            {/* Mounted only on launch: no scene imports, hidden iframe, or route prefetch on the desktop. */}
            <iframe src="/threedportfolio" title="Ayush Agrawal's 3D portfolio" className="h-full w-full border-0" allow="autoplay; fullscreen" allowFullScreen style={{ background: '#07070b' }} />
          </WindowFrame>
        )}

        {open.ask && (
          <WindowFrame key="ask" {...frame('ask')} subtitle="online" background="rgba(19,22,36,0.86)">
            <div className="h-full select-text">
              <AskApp request={askRequest} />
            </div>
          </WindowFrame>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {launcherOpen && (
          <Launcher
            key="launcher"
            mobile={mobile}
            onOpen={openApp}
            onAsk={(q) => askAyush(q)}
            onClose={() => setLauncherOpen(false)}
          />
        )}
        {ccOpen && (
          <ControlCenter
            key="cc"
            mobile={mobile}
            onOpenAsk={() => askAyush()}
            wallpaper={wallpaper.id}
            onWallpaper={chooseWallpaper}
          />
        )}
      </AnimatePresence>

      {!mobile && <Island active={ccOpen} onClick={() => setCCOpen((o) => !o)} />}


      <Dock
        mobile={mobile}
        askIsNew={!askSeen}
        running={open}
        launcherOpen={launcherOpen}
        onOpen={openApp}
        onLauncher={() => setLauncherOpen((o) => !o)}
      />

      <MenuBar
        mobile={mobile}
        appName={activeApp ? TITLES[activeApp] : 'Ayush'}
        launcherOpen={launcherOpen}
        ccOpen={ccOpen}
        onHelp={startTour}
        onOpenResume={() => openApp('resume')}
        onToggleLauncher={() => {
          setLauncherOpen((o) => !o);
          if (mobile) setCCOpen(false);
        }}
        onToggleCC={() => {
          setCCOpen((o) => !o);
          if (mobile) setLauncherOpen(false);
        }}
      />

      {touring && <Tour onFinish={finishTour} onOpenAsk={() => openApp('ask')} />}
    </div>
  );
}
