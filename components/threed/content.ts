import { DATA } from '@/data_ui_portfolio/resume';

/** A headline fact under a chapter: the thing itself, and a line of small print about it. */
export type Fact = [value: string, label: string];
export type ChapterCopy = { id: string; kanji: string; title: string; line: string; facts?: Fact[] };

/** The résumé data keeps each description as "- point" lines in one string. */
const bullets = (text: string) => text.split('\n').map((line) => line.replace(/^-\s*/, ''));

/**
 * The six chapters, in scroll order. Each one is a place in the 3D world. They carry only the
 * headlines: the full résumé lives on the desktop, and chapters with facts link back to it.
 */
export const CHAPTERS: ChapterCopy[] = [
  {
    id: 'origin',
    kanji: '一',
    title: 'One-man army',
    line: 'Frontend, backend, on-chain programs, DevOps and automation. One person, from the first commit to production.',
  },
  {
    id: 'grove',
    kanji: '二',
    title: 'Foundations',
    line: 'Computer Science at BITS Pilani, with two builder cohorts alongside it.',
    facts: [
      ['BITS Pilani', 'Computer Science · 2024 – 2027'],
      ['100xDevs · Turbin3', 'Web, DevOps and Solana cohorts'],
    ],
  },
  {
    id: 'frame',
    kanji: '三',
    title: 'The stack',
    line: 'Every layer of a product, in one pair of hands.',
    facts: [
      ['Frontend', 'Next.js · React · Tailwind'],
      ['Backend', 'Node.js · Rust · PostgreSQL'],
      ['Web3', 'Solana · Anchor · Solidity'],
      ['DevOps', 'Docker · AWS · CI/CD'],
    ],
  },
  {
    id: 'work',
    kanji: '四',
    title: 'The work',
    line: 'Bots, wallets, on-chain programs, client sites and automation. Seven builds, each shipped end to end.',
  },
  {
    id: 'path',
    kanji: '五',
    title: 'Shipped',
    line: 'A trading terminal built from scratch, interface to API. Then the backend of a workforce platform.',
    facts: DATA.work
      .slice()
      .reverse()
      .map((w): Fact => [w.company, `${w.title.replace(/\s*\(Intern\)/, ' intern')} · ${w.start} – ${w.end}`]),
  },
  {
    id: 'lanterns',
    kanji: '六',
    title: 'What’s next',
    line: 'Bring the idea. I’ll take it from the first commit to production, alone if need be.',
  },
];

/** The two roles pinned to lanterns along the path in chapter five, oldest first. */
export const JOBS = DATA.work
  .slice()
  .reverse()
  .map((w) => w.company as string);

/** The four disciplines pinned to the frame in chapter three, each led off to one side of it. */
const PILLARS: Label[] = [
  { text: 'Frontend', side: 'left' },
  { text: 'Backend', side: 'right' },
  { text: 'Web3', side: 'right' },
  { text: 'DevOps', side: 'left' },
];

export type Label = { text: string; side: 'left' | 'right' | 'on' };
/** Every label the engine positions over the canvas, in the order it expects them. */
export const LABELS: Label[] = [...PILLARS, ...JOBS.map((text): Label => ({ text, side: 'on' }))];

// Kanagawa accents, one per project: crystal blue, sakura, spring green, surimi orange, carp yellow, oni violet, spring blue.
const TINTS = ['#7E9CD8', '#D27E99', '#98BB6C', '#FFA066', '#E6C384', '#957FB8', '#7FB4CA'];

export type Project = {
  name: string;
  dates: string;
  tint: string;
  bullets: string[];
  tech: string[];
  links: { type: string; href: string }[];
  video: string;
};

export const PROJECTS: Project[] = DATA.projects.map((p, i) => ({
  name: p.title,
  dates: p.dates,
  tint: TINTS[i % TINTS.length],
  bullets: bullets(p.description),
  tech: [...p.technologies],
  links: p.links.map((l) => ({ type: l.type === 'Github' ? 'GitHub' : l.type, href: l.href })),
  video: p.ytvideo,
}));

export const CONTACT = {
  name: DATA.name,
  email: DATA.contact.email,
  current: DATA.work[0],
  social: [DATA.contact.social.GitHub, DATA.contact.social.LinkedIn, DATA.contact.social.X].map((s) => ({ name: s.name, url: s.url })),
};
