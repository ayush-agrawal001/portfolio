'use client';

import Link from 'next/link';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { CHAPTERS, CONTACT, LABELS, PROJECTS } from './content';
import type { Engine } from './engine/engine';

const pad = (n: number) => String(n).padStart(2, '0');

/** A title split into letters, so each can rise in on its own beat. Words stay whole when the line wraps. */
function Letters({ text }: { text: string }) {
  let i = 0;
  return (
    <>
      {text.split(' ').map((word, w) => (
        <Fragment key={w}>
          {w > 0 && ' '}
          <span className="td-word">
            {[...word].map((ch) => (
              <span key={i} className="td-char" style={{ '--i': i++ } as React.CSSProperties}>
                {ch}
              </span>
            ))}
          </span>
        </Fragment>
      ))}
    </>
  );
}

export function Story() {
  const mount = useRef<HTMLDivElement>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const footer = useRef<HTMLElement>(null);
  const intro = useRef<HTMLElement>(null);
  const finale = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const cue = useRef<HTMLDivElement>(null);
  const railFill = useRef<HTMLElement>(null);
  const chapterEl = useRef<HTMLElement>(null);
  const labels = useRef<(HTMLSpanElement | null)[]>([]);
  const engine = useRef<Engine | null>(null);

  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [entered, setEntered] = useState(false);
  const [chapter, setChapter] = useState(-1);
  /** The chapter whose words are on screen. It trails `chapter`, so the old title can fade before the new one is set. */
  const [titled, setTitled] = useState(-1);
  const [titleOn, setTitleOn] = useState(false);
  const [count, setCount] = useState(0);
  const [panel, setPanel] = useState({ index: -1, hot: false });
  const [card, setCard] = useState(0);
  const [open, setOpen] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [sound, setSound] = useState(false);
  const [stops, setStops] = useState<number[]>([]);
  const [footerOn, setFooterOn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let dead = false;
    let made: Engine | null = null;
    document.documentElement.classList.add('td-lock-gate');
    import('./engine/engine')
      .then((m) => {
        if (dead) return null;
        return m.createEngine({
          mount: mount.current!,
          scroll: scroll.current!,
          footer: footer.current!,
          els: {
            intro: intro.current!,
            finale: finale.current!,
            cue: cue.current!,
            railFill: railFill.current!,
            chapter: chapterEl.current!,
            labels: labels.current.filter((el): el is HTMLSpanElement => !!el),
          },
          panels: PROJECTS,
          chapterCount: CHAPTERS.length,
          onProgress: (p) => !dead && setProgress(p),
          onChapter: (i) => !dead && setChapter(i),
          onCount: (n) => !dead && setCount(n),
          onPanel: (index, hot) => !dead && setPanel({ index, hot }),
          onOpen: (i) => !dead && setOpen(i),
          onSound: (on) => !dead && setSound(on),
          onFooter: (on) => !dead && setFooterOn(on),
        });
      })
      .then((e) => {
        if (!e) return;
        if (dead) return e.dispose();
        made = e;
        engine.current = e;
        // in development, `__td.seek(12)` in the console jumps straight to a shot
        if (process.env.NODE_ENV !== 'production') (window as unknown as { __td?: Engine }).__td = e;
        setStops(e.stops);
        setReady(true);
      })
      .catch((err) => {
        console.error('[threed] could not start', err);
        if (!dead) setFailed(true);
      });
    return () => {
      dead = true;
      made?.dispose();
      engine.current = null;
      document.documentElement.classList.remove('td-lock-gate', 'td-lock-modal');
    };
  }, []);

  // swap the chapter title: fade the old one out, change the words, fade the new one in
  useEffect(() => {
    setTitleOn(false);
    if (chapter < 0) return;
    const t = setTimeout(() => {
      setTitled(chapter);
      requestAnimationFrame(() => requestAnimationFrame(() => setTitleOn(true)));
    }, 380);
    return () => clearTimeout(t);
  }, [chapter]);

  useEffect(() => {
    if (panel.index >= 0) {
      setCard(panel.index);
      engine.current?.audio.sfx('card');
    }
  }, [panel.index]);

  const close = useCallback(() => {
    setOpen((was) => {
      if (was >= 0) engine.current?.audio.sfx('close');
      return -1;
    });
    setPlaying(false);
  }, []);

  useEffect(() => {
    const isOpen = open >= 0;
    engine.current?.setModal(isOpen);
    document.documentElement.classList.toggle('td-lock-modal', isOpen);
    if (!isOpen) {
      dialog.current?.close();
      return;
    }
    dialog.current?.showModal();
    engine.current?.audio.sfx('open');
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [open, close]);

  const enter = (withSound: boolean) => {
    engine.current?.audio.enter(withSound);
    document.documentElement.classList.remove('td-lock-gate');
    setEntered(true);
  };

  const go = (index: number) => {
    setMenuOpen(false);
    engine.current?.jump(index);
  };

  // small sounds for anything clickable, without wiring every button
  const lastHover = useRef<Element | null>(null);
  const onOver = (e: React.PointerEvent) => {
    const hit = (e.target as HTMLElement).closest('a, button');
    if (hit && hit !== lastHover.current) engine.current?.audio.sfx('hover');
    lastHover.current = hit;
  };
  const onClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('a, button')) engine.current?.audio.sfx('click');
  };

  const text = titled >= 0 ? CHAPTERS[titled] : null;
  const project = open >= 0 ? PROJECTS[open] : null;
  const shown = PROJECTS[card];
  const cardOn = panel.index >= 0 && open < 0;

  return (
    <div
      className={`td ${cardOn ? 'td-has-card' : ''} ${panel.hot ? 'td-hot' : ''} ${footerOn ? 'td-footer-on' : ''}`}
      onPointerOver={onOver}
      onClickCapture={onClick}
    >
      <div ref={mount} className="td-gl" aria-hidden="true" />

      <div className="td-ui" inert={!entered}>
        <header className="td-head" data-ui>
          <button type="button" className="td-brand" onClick={() => engine.current?.jump(0)} aria-label="Back to the start">
            {/* The portrait is decorative; the adjacent text supplies the accessible name. */}
            <img className="td-avatar" src="/profile_5.png" width="32" height="32" alt="" />
            <span>{CONTACT.name}</span>
          </button>
          <p className="td-count td-mono" aria-hidden="true">
            <b>{pad(count)}</b> / {pad(CHAPTERS.length)}
          </p>
          <nav className="td-nav" aria-label="Experience controls">
            <button type="button" className={`td-sound ${sound ? 'playing' : ''}`} aria-pressed={sound} onClick={() => engine.current?.audio.toggle()}>
              <span className="td-equalizer" aria-hidden="true"><i /><i /><i /><i /></span>
              Sound {sound ? 'on' : 'off'}
            </button>
            <button type="button" className="td-menu-toggle" aria-expanded={menuOpen} aria-controls="td-index" onClick={() => setMenuOpen(!menuOpen)}>Chapters <span aria-hidden="true">{menuOpen ? '−' : '+'}</span></button>
          </nav>
        </header>

        <nav id="td-index" className={`td-index ${menuOpen ? 'expanded' : ''}`} aria-label="Chapter index" data-ui>
          {CHAPTERS.map((c, i) => (
            <button key={c.id} type="button" className={count === i + 1 ? 'active' : ''} aria-current={count === i + 1 ? 'step' : undefined} onClick={() => go(i + 1)} aria-label={`Chapter ${i + 1}: ${c.title}`}>
              <span>{pad(i + 1)}</span> {c.title}
            </button>
          ))}
          <div className="td-index-links"><Link href="/portfolio">Résumé ↗</Link><a href="/" target="_top">Desktop ↗</a></div>
        </nav>

        <section ref={intro} className="td-intro">
          <p className="td-kicker">Independent developer. End-to-end builder.</p>
          <h1>
            {CONTACT.name} — frontend, backend and Web3, by one person.
          </h1>
          <p className="td-now">
            <i aria-hidden="true" />
            Currently building at{' '}
            <a href={CONTACT.current.href} target="_blank" rel="noreferrer">
              {CONTACT.current.company}
            </a>
          </p>
        </section>

        <section ref={chapterEl} className={`td-chapter ${titleOn ? 'on' : ''}`} aria-live="polite" aria-hidden={!titleOn || cardOn}>
          {text && (
            <>
              <p className="td-ch-meta td-mono">
                <span className="td-ch-number">{pad(titled + 1)}</span><i aria-hidden="true" /> Chapter
              </p>
              <h2 aria-label={text.title}>
                <Letters text={text.title} />
              </h2>
              <p className="td-ch-line">{text.line}</p>
              {titled === 3 && <div className="td-work-actions">
                <button type="button" className="td-more" tabIndex={titleOn ? 0 : -1} onClick={() => setOpen(0)}>Explore all {PROJECTS.length} projects <span aria-hidden="true">↗</span></button>
                <button type="button" className="td-more" tabIndex={titleOn ? 0 : -1} onClick={() => engine.current?.hatch()}>Meet the builder <span aria-hidden="true">↓</span></button>
              </div>}
              {text.facts && (
                <>
                  <dl className="td-facts">
                    {text.facts.map(([value, label], j) => (
                      <div key={value} style={{ '--j': j } as React.CSSProperties}>
                        <dt>{value}</dt>
                        <dd className="td-mono">{label}</dd>
                      </div>
                    ))}
                  </dl>
                  {/* this page is the trailer: the whole résumé is on the desktop */}
                  <Link className="td-more" href="/portfolio" tabIndex={titleOn ? 0 : -1}>
                    Explore my résumé <span aria-hidden="true">↗</span>
                  </Link>
                </>
              )}
            </>
          )}
        </section>

        <div className={`td-card ${cardOn ? 'on' : ''}`} aria-hidden={!cardOn} inert={!cardOn} style={{ '--pc': shown.tint } as React.CSSProperties} data-ui>
          <p className="td-mono">{shown.tech.slice(0, 3).join(' · ')}</p>
          <h3>{shown.name}</h3>
          <button type="button" tabIndex={cardOn ? 0 : -1} onClick={() => setOpen(card)}>
            View project <span aria-hidden="true">→</span>
          </button>
        </div>

        <nav className="td-rail td-mono" aria-label="Story progress" data-ui>
          <i ref={railFill} className="td-rail-fill" />
          {CHAPTERS.map((c, i) => (
            <button
              key={c.id}
              type="button"
              className={count === i + 1 ? 'on' : ''}
              style={{ top: `${(stops[i] ?? 0) * 100}%` }}
              onClick={() => go(i + 1)}
              aria-label={`Jump to ${c.title}`}
            >
              <span>
                {c.title}
              </span>
              <b>{pad(i + 1)}</b>
            </button>
          ))}
        </nav>

        <div className="td-labels" aria-hidden="true">
          {LABELS.map((label, i) => (
            <span
              key={label.text}
              ref={(el) => {
                labels.current[i] = el;
              }}
              className="td-label td-mono"
              data-side={label.side}
            >
              <i />
              <b>{label.text}</b>
            </span>
          ))}
        </div>

        <div ref={cue} className="td-cue td-mono" aria-hidden="true">
          Scroll to explore <span>↓</span>
        </div>

        <section ref={finale} className="td-finale">
          <p className="td-kicker">From the first commit to what comes next.</p>
          <h2>One person.<br />One thread.</h2>
          <p>Frontend · Backend · Web3 · DevOps</p>
        </section>
      </div>

      <div ref={scroll} className="td-scroll" />

      <footer ref={footer} className="td-footer" inert={!entered}>
        <p className="td-kicker">Open to full-stack, backend and Web3 work</p>
        <h2>Let’s build<br />what’s next.</h2>
        <a className="td-mail" href={`mailto:${CONTACT.email}`}>
          {CONTACT.email} <span aria-hidden="true">↗</span>
        </a>
        <nav className="td-mono" aria-label="Elsewhere">
          {CONTACT.social.map((s) => (
            <a key={s.name} href={s.url} target="_blank" rel="noreferrer">
              {s.name} ↗
            </a>
          ))}
          <Link href="/portfolio">Résumé</Link>
          <a href="/" target="_top">Desktop</a>
        </nav>
        <div className="td-foot-end td-mono">
          <span>
            © {new Date().getFullYear()} {CONTACT.name}
          </span>
          <button type="button" onClick={() => engine.current?.jump(0)}>
            Begin again ↑
          </button>
        </div>
      </footer>

      <dialog
        ref={dialog}
        className={`td-modal ${project ? 'open' : ''}`}
        aria-label={project?.name}
        style={{ '--pc': project?.tint ?? '#7E9CD8' } as React.CSSProperties}
        onClick={(e) => e.target === e.currentTarget && close()}
        onCancel={(e) => { e.preventDefault(); close(); }}
      >
        {project && (
          <article>
            <header>
              <div>
                <p className="td-mono">{project.dates}</p>
                <h2>{project.name}</h2>
              </div>
              <button type="button" className="td-mono" onClick={close}>
                Close
              </button>
            </header>
            {project.video &&
              (playing ? (
                <iframe
                  src={`${project.video}${project.video.includes('?') ? '&' : '?'}autoplay=1`}
                  title={`${project.name} demo`}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <button type="button" className="td-play" onClick={() => setPlaying(true)}>
                  <span aria-hidden="true">▶</span> Watch the demo
                </button>
              ))}
            <ul>
              {project.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <p className="td-tech td-mono">
              {project.tech.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </p>
            <footer className="td-mono">
              {project.links.map((l) => (
                <a key={l.href} href={l.href} target="_blank" rel="noreferrer">
                  {l.type} ↗
                </a>
              ))}
            </footer>
            <nav className="td-project-paging" aria-label="Browse projects">
              <button type="button" onClick={() => { setPlaying(false); setOpen((open + PROJECTS.length - 1) % PROJECTS.length); }}>← Previous</button>
              <span>{pad(open + 1)} / {pad(PROJECTS.length)}</span>
              <button type="button" onClick={() => { setPlaying(false); setOpen((open + 1) % PROJECTS.length); }}>Next →</button>
            </nav>
          </article>
        )}
      </dialog>

      <div className={`td-loader ${ready ? 'ready' : ''} ${entered ? 'done' : ''}`} aria-hidden={entered}>
        {failed ? (
          <div className="td-loader-in">
            <p className="td-mono">This page needs WebGL, which this browser did not provide.</p>
            <Link className="td-enter" href="/portfolio">
              Open the plain portfolio
            </Link>
          </div>
        ) : (
          <div className="td-loader-in">
            <span className="td-loader-orbit" aria-hidden="true"><i /></span>
            <p className="td-mono td-loader-k">{ready ? 'Best with headphones' : 'Stringing the thread'}</p>
            {!ready && <p className="td-mono td-loader-p" role="status">{Math.round(progress * 100)}%</p>}
            <i className="td-loader-bar">
              <i style={{ transform: `scaleX(${progress})` }} />
            </i>
            <div className="td-loader-go">
              <button type="button" className="td-enter" disabled={!ready} onClick={() => enter(true)}>
                Enter with sound
              </button>
              <button type="button" className="td-enter td-quiet" disabled={!ready} onClick={() => enter(false)}>
                Enter muted
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
