'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
} from 'framer-motion';
import { cn } from '@/lib/utils';

const ROLES = [
  'Full-Stack Developer',
  'UI Engineer',
  'Creative Coder',
  'Problem Solver',
];

const STATS = [
  { label: 'Projects shipped', value: 24, suffix: '+' },
  { label: 'Technologies', value: 18, suffix: '+' },
  { label: 'Years building', value: 3, suffix: '+' },
  { label: 'Coffee consumed', value: 999, suffix: '' },
];

const SKILLS = [
  { name: 'React / Next.js', level: 92 },
  { name: 'TypeScript', level: 88 },
  { name: 'Node.js', level: 85 },
  { name: 'Python', level: 80 },
  { name: 'UI / Motion Design', level: 90 },
  { name: 'Cloud & DevOps', level: 75 },
];

const PROJECTS = [
  {
    title: 'Terminal Portfolio',
    desc: 'CLI-first portfolio with animated UI mode — this site.',
    tags: ['Next.js', 'Framer Motion', 'Tailwind'],
    gradient: 'from-violet-600/40 to-cyan-500/30',
  },
  {
    title: 'Neural Canvas',
    desc: 'Generative art playground with real-time WebGL shaders.',
    tags: ['WebGL', 'React', 'Three.js'],
    gradient: 'from-fuchsia-600/40 to-purple-500/30',
  },
  {
    title: 'Pulse Analytics',
    desc: 'Realtime dashboard with animated charts and live data streams.',
    tags: ['TypeScript', 'D3', 'WebSockets'],
    gradient: 'from-cyan-600/40 to-blue-500/30',
  },
  {
    title: 'Orbit Commerce',
    desc: 'Headless e-commerce with micro-interactions on every touchpoint.',
    tags: ['Next.js', 'Stripe', 'Prisma'],
    gradient: 'from-amber-600/30 to-rose-500/30',
  },
];

const MARQUEE_ITEMS = [
  'React',
  'Next.js',
  'TypeScript',
  'Node.js',
  'Python',
  'Tailwind',
  'Framer Motion',
  'PostgreSQL',
  'Docker',
  'Figma',
  'Git',
  'AWS',
];

const NAV_LINKS = [
  { href: '#about', label: 'About' },
  { href: '#skills', label: 'Skills' },
  { href: '#projects', label: 'Projects' },
  { href: '#contact', label: 'Contact' },
];

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 48 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function AnimatedCounter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 60, damping: 20 });
  const rounded = useTransform(spring, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (inView) motionVal.set(value);
  }, [inView, motionVal, value]);

  useEffect(() => {
    const unsub = rounded.on('change', (v) => setDisplay(v));
    return unsub;
  }, [rounded]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}

function FloatingOrbs() {
  return (
    <motion.div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      aria-hidden
    >
      <motion.div
        className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-violet-600/25 blur-[100px]"
        animate={{ x: [0, 80, 0], y: [0, -40, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -right-24 top-1/3 h-[28rem] w-[28rem] rounded-full bg-cyan-500/20 blur-[110px]"
        animate={{ x: [0, -60, 0], y: [0, 50, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-fuchsia-500/15 blur-[90px]"
        animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  );
}

function RoleRotator() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % ROLES.length);
    }, 2800);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="inline-flex h-[1.2em] min-w-[16ch] items-center overflow-hidden text-violet-300">
      <AnimatePresence mode="wait">
        <motion.span
          key={ROLES[index]}
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -24, opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="absolute"
        >
          {ROLES[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function MagneticButton({
  children,
  className,
  href,
}: {
  children: React.ReactNode;
  className?: string;
  href: string;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20 });
  const springY = useSpring(y, { stiffness: 300, damping: 20 });

  return (
    <motion.a
      ref={ref}
      href={href}
      style={{ x: springX, y: springY }}
      onMouseMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        x.set((e.clientX - rect.left - rect.width / 2) * 0.12);
        y.set((e.clientY - rect.top - rect.height / 2) * 0.12);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.98 }}
      className={className}
    >
      {children}
    </motion.a>
  );
}

export function AnimatedPortfolio() {
  const [scrolled, setScrolled] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [mouseX, mouseY]);

  const spotlightX = useTransform(mouseX, (v) => v - 200);
  const spotlightY = useTransform(mouseY, (v) => v - 200);

  return (
    <motion.div
      className="portfolio-root relative font-[family-name:var(--font-geist)] selection:bg-violet-500/30"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <FloatingOrbs />
      <motion.div
        className="portfolio-noise pointer-events-none fixed inset-0 z-[1]"
        aria-hidden
      />
      <motion.div
        className="pointer-events-none fixed z-[2] h-[400px] w-[400px] rounded-full bg-violet-500/10 blur-[80px]"
        style={{ left: spotlightX, top: spotlightY }}
        aria-hidden
      />
      <motion.div
        className="portfolio-grid-bg pointer-events-none fixed inset-0 z-[2]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        aria-hidden
      />

      {/* Nav */}
      <motion.header
        className={cn(
          'fixed top-0 z-50 w-full transition-all duration-500',
          scrolled
            ? 'border-b border-white/10 bg-[#050508]/80 py-3 backdrop-blur-xl'
            : 'bg-transparent py-5'
        )}
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6 }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
          <Link href="/" className="group flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white">
            <motion.span
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-xs font-bold text-violet-300"
              whileHover={{ rotate: -8, scale: 1.05 }}
            >
              A
            </motion.span>
            <span className="hidden sm:inline">Back to terminal</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link, i) => (
              <motion.a
                key={link.href}
                href={link.href}
                className="text-sm text-zinc-400 transition hover:text-white"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                whileHover={{ y: -2 }}
              >
                {link.label}
              </motion.a>
            ))}
          </nav>
          <MagneticButton
            href="#contact"
            className="rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-violet-500/25"
          >
            Let&apos;s talk
          </MagneticButton>
        </div>
      </motion.header>

      {/* Hero */}
      <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 pt-24 text-center">
        <motion.div
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-zinc-400 backdrop-blur-sm"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <motion.span
            className="h-2 w-2 rounded-full bg-emerald-400"
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          Available for opportunities
        </motion.div>

        <motion.h1
          className="max-w-4xl text-5xl font-bold tracking-tight sm:text-7xl md:text-8xl"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="portfolio-gradient-text">Ayush</span>
        </motion.h1>

        <motion.p
          className="mt-6 flex flex-wrap items-center justify-center gap-2 text-lg text-zinc-400 sm:text-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <span>I&apos;m a</span>
          <RoleRotator />
        </motion.p>

        <motion.p
          className="mt-4 max-w-xl text-zinc-500"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85 }}
        >
          Building expressive web experiences — from terminal aesthetics to
          cinematic UI with motion at every layer.
        </motion.p>

        <motion.div
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          <MagneticButton
            href="#projects"
            className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-zinc-900 shadow-xl shadow-white/10"
          >
            View work
          </MagneticButton>
          <MagneticButton
            href="#contact"
            className="rounded-full border border-white/15 bg-white/5 px-8 py-3 text-sm font-medium text-white backdrop-blur-sm"
          >
            Get in touch
          </MagneticButton>
        </motion.div>

        <motion.div
          className="absolute bottom-12 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="h-10 w-6 rounded-full border border-white/20 p-1">
            <motion.div
              className="mx-auto h-2 w-1 rounded-full bg-violet-400"
              animate={{ y: [0, 12, 0], opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </section>

      {/* Marquee */}
      <section className="relative z-10 border-y border-white/5 py-6">
        <motion.div
          className="flex overflow-hidden"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <motion.div className="portfolio-marquee-track flex shrink-0 gap-8 whitespace-nowrap px-4">
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
              <span
                key={`${item}-${i}`}
                className="text-sm font-medium uppercase tracking-widest text-zinc-600"
              >
                {item}
                <span className="mx-8 text-violet-500/50">◆</span>
              </span>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-24">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {STATS.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 0.1}>
              <motion.div
                className="portfolio-card-glow rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center backdrop-blur-sm"
                whileHover={{ y: -6, transition: { duration: 0.25 } }}
              >
                <p className="text-3xl font-bold text-white md:text-4xl">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="mt-2 text-sm text-zinc-500">{stat.label}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* About */}
      <section id="about" className="relative z-10 mx-auto max-w-6xl px-6 py-24">
        <Reveal>
          <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-violet-400">
            About
          </h2>
          <p className="mt-4 max-w-3xl text-3xl font-semibold leading-snug text-white md:text-4xl">
            I craft interfaces that feel alive — blending engineering precision
            with motion design and bold visual identity.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-8 md:grid-cols-2">
          <Reveal delay={0.15}>
            <motion.div
              className="h-full rounded-2xl border border-white/10 bg-gradient-to-br from-violet-950/50 to-transparent p-8"
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <h3 className="text-lg font-semibold text-white">What I do</h3>
              <p className="mt-3 text-zinc-400 leading-relaxed">
                Full-stack development with a focus on React ecosystems, API
                design, and pixel-perfect UI. I love turning complex ideas into
                smooth, animated experiences users remember.
              </p>
            </motion.div>
          </Reveal>
          <Reveal delay={0.25}>
            <motion.div
              className="h-full rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-950/40 to-transparent p-8"
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <h3 className="text-lg font-semibold text-white">How I work</h3>
              <p className="mt-3 text-zinc-400 leading-relaxed">
                Start with the terminal — ship fast, iterate in the open. When
                you run <code className="text-violet-300">openuiportfolio</code>,
                you get the full cinematic experience. Two modes, one developer.
              </p>
            </motion.div>
          </Reveal>
        </div>
      </section>

      {/* Skills */}
      <section id="skills" className="relative z-10 mx-auto max-w-6xl px-6 py-24">
        <Reveal>
          <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">
            Skills
          </h2>
          <p className="mt-2 text-2xl font-semibold text-white">Tools & strengths</p>
        </Reveal>
        <motion.div
          className="mt-12 space-y-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.1 } },
          }}
        >
          {SKILLS.map((skill) => (
            <motion.div
              key={skill.name}
              variants={{
                hidden: { opacity: 0, x: -24 },
                visible: { opacity: 1, x: 0 },
              }}
              className="group"
            >
              <motion.div className="mb-2 flex justify-between text-sm">
                <span className="text-zinc-300">{skill.name}</span>
                <span className="text-zinc-500">{skill.level}%</span>
              </motion.div>
              <motion.div className="h-2 overflow-hidden rounded-full bg-white/5">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
                  initial={{ width: 0 }}
                  whileInView={{ width: `${skill.level}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                />
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Projects */}
      <section id="projects" className="relative z-10 mx-auto max-w-6xl px-6 py-24">
        <Reveal>
          <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-fuchsia-400">
            Projects
          </h2>
          <p className="mt-2 text-2xl font-semibold text-white">Selected work</p>
        </Reveal>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {PROJECTS.map((project, i) => (
            <Reveal key={project.title} delay={i * 0.1}>
              <motion.article
                className={cn(
                  'portfolio-card-glow group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-8',
                  'cursor-default'
                )}
                whileHover={{ y: -8 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <motion.div
                  className={cn(
                    'absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-500 group-hover:opacity-100',
                    project.gradient
                  )}
                />
                <motion.div
                  className="relative z-10"
                  initial={false}
                  whileHover={{ x: 4 }}
                >
                  <h3 className="text-xl font-semibold text-white">{project.title}</h3>
                  <p className="mt-3 text-zinc-400">{project.desc}</p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.div>
              </motion.article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="relative z-10 mx-auto max-w-6xl px-6 py-32">
        <Reveal>
          <motion.div
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-950/60 via-[#0c0c14] to-cyan-950/40 p-12 text-center md:p-16"
            whileInView={{ scale: [0.98, 1] }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl"
              animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 5, repeat: Infinity }}
            />
            <h2 className="relative text-3xl font-bold text-white md:text-5xl">
              Let&apos;s build something{' '}
              <span className="portfolio-gradient-text">extraordinary</span>
            </h2>
            <p className="relative mt-4 text-zinc-400">
              Open to freelance, collaborations, and full-time roles.
            </p>
            <motion.div
              className="relative mt-10 flex flex-wrap justify-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <MagneticButton
                href="mailto:hello@ayush.dev"
                className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-zinc-900"
              >
                hello@ayush.dev
              </MagneticButton>
              <Link href="/">
                <motion.span
                  className="inline-block rounded-full border border-white/15 px-8 py-3 text-sm text-zinc-300"
                  whileHover={{ scale: 1.04, borderColor: 'rgba(255,255,255,0.3)' }}
                  whileTap={{ scale: 0.98 }}
                >
                  ← Return to terminal
                </motion.span>
              </Link>
            </motion.div>
          </motion.div>
        </Reveal>
      </section>

      <footer className="relative z-10 border-t border-white/5 py-8 text-center text-sm text-zinc-600">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          © {new Date().getFullYear()} Ayush — Crafted with motion & code
        </motion.p>
      </footer>
    </motion.div>
  );
}
