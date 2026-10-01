import { RESUME } from '@/data_cli_terminal/resume';
import { DATA } from '@/data_ui_portfolio/resume';
import { WRITEUPS } from './writeups';

/** Public links for each project, keyed by RESUME.projects[].id. */
export const PROJECT_LINKS: Record<string, { github?: string; demo?: string; video?: string }> = {
  chaingenie: {
    github: 'https://github.com/ayush-agrawal001/telegram_solana__token_and_NFT_launchpad',
    video: 'https://www.youtube.com/watch?v=Yz2QZPdyoVY',
  },
  jagruk: {
    github: 'https://github.com/ayush-agrawal001/Jagruk.life',
    demo: 'https://jagruklife.vercel.app/',
    video: 'https://www.youtube.com/watch?v=fEHCLybLMvM',
  },
  'cds-rwa': { github: 'https://github.com/ayush-agrawal001/Credit_default_swaps_RWA_Contract' },
  zenqor: { github: 'https://github.com/ayush-agrawal001/zenqor' },
  'invoice-automation': { github: 'https://github.com/ayush-agrawal001/gscript-automating-invoices' },
  'sol-wallet': {
    github: 'https://github.com/ayush-agrawal001/SOL_WALLET',
    demo: 'https://sol-wallet-bqh5.vercel.app/',
    video: 'https://www.youtube.com/watch?v=qyqjAsXwtQ8',
  },
  videocall: {
    github: 'https://github.com/ayush-agrawal001/Video-chat-app',
    video: 'https://www.youtube.com/watch?v=uuto1xwzJHA',
  },
};

export const PROFILE_LINKS = {
  github: 'https://github.com/ayush-agrawal001',
  linkedin: 'https://www.linkedin.com/in/ayush-agrawal-8813ab270/',
  x: 'https://x.com/bunnyTheRobo001',
  website: RESUME.contact.websiteUrl,
  email: RESUME.contact.email,
};

export type Source = { kind: string; label: string; href?: string };

export type Example = {
  q: string;
  a: string;
  more: string;
  sources: Source[];
  /** Other wordings of the same question, which get the same answer. */
  alt?: string[];
  /** Suggested follow-ups. Each must itself be a pre-written question. */
  next?: string[];
};

const EMAIL = RESUME.contact.email;
const RESUME_SOURCE = (label: string): Source => ({ kind: 'résumé', label });
const PORTFOLIO_SOURCE: Source = { kind: 'this site', label: 'Portfolio', href: '/portfolio' };

/** One fact from the résumé or portfolio, shown word for word when a question matches it. */
export type Passage = {
  id: string;
  title: string;
  text: string;
  sources: Source[];
  /** Extra words a visitor might use for this fact. Searched, never shown. */
  aliases?: string[];
};

const host = (url: string) => new URL(url).hostname.replace(/^www\./, '');
const lastSegment = (url: string) => new URL(url).pathname.split('/').filter(Boolean).pop() ?? host(url);
const bullets = (items: readonly string[]) => items.map((b) => `• ${b}`);
const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const PROJECT_ALIASES: Record<string, string[]> = {
  chaingenie: ['telegram bot'],
  'cds-rwa': ['cds', 'rwa'],
  zenqor: ['freelance', 'client'],
  'invoice-automation': ['invoice robot', 'billing'],
  'sol-wallet': ['vault', 'wallet'],
  videocall: ['video call'],
};

/**
 * Everything Ask Ayush can look up, built from the résumé data and the portfolio page's data.
 * The phone number is deliberately left out. Edit those data files (or writeups.ts) to change an answer.
 */
function buildPassages(): Passage[] {
  const out: Passage[] = [];

  out.push({
    id: 'about',
    title: 'Ayush, in his own words',
    text: `“${DATA.summary}”`,
    sources: [PORTFOLIO_SOURCE],
    aliases: ['bio', 'summary', 'introduction', 'background', 'overview', 'himself'],
  });

  out.push({
    id: 'location',
    title: `Based in ${DATA.location}`,
    text: DATA.work.map((w) => `${w.company}: ${w.location}`).join('\n'),
    sources: [PORTFOLIO_SOURCE],
    aliases: ['location', 'remote', 'onsite', 'hybrid', 'office'],
  });

  for (const w of RESUME.work) {
    const extra = DATA.work.find((d) => key(d.company) === key(w.company));
    out.push({
      id: `work-${key(w.company)}`,
      title: `${w.title} at ${w.company}`,
      text: [extra ? `${w.period} · ${extra.location}` : w.period, ...bullets(w.bullets)].join('\n'),
      sources: [RESUME_SOURCE(`${w.title}, ${w.company}`), ...(extra ? [{ kind: 'website', label: host(extra.href), href: extra.href }] : [])],
      aliases: ['work', 'experience', 'years', 'duration'],
    });
  }

  RESUME.education.forEach((e, i) => {
    const extra = DATA.education[i];
    out.push({
      id: `education-${i}`,
      title: e.degree,
      text: `${e.school}\n${e.period}`,
      sources: [RESUME_SOURCE('Education'), ...(extra ? [{ kind: 'website', label: host(extra.href), href: extra.href }] : [])],
      aliases: ['education'],
    });
  });

  for (const p of RESUME.projects) {
    const extra = DATA.projects.find((d) => key(d.title) === key(p.name));
    const links = PROJECT_LINKS[p.id] ?? {};
    const extraLinks: readonly { type: string; href: string }[] = extra?.links ?? [];
    const sources: Source[] = [
      ...(links.github ? [{ kind: 'github', label: lastSegment(links.github), href: links.github }] : []),
      ...(links.demo ? [{ kind: 'live', label: host(links.demo), href: links.demo }] : []),
      ...(links.video ? [{ kind: 'video', label: 'Demo on YouTube', href: links.video }] : []),
      // Links the portfolio page has and PROJECT_LINKS does not (e.g. a launch post).
      ...extraLinks
        .filter((l) => !['github', 'website'].includes(l.type.toLowerCase()))
        .map((l) => ({ kind: l.type.toLowerCase(), label: host(l.href), href: l.href })),
    ];
    out.push({
      id: `project-${p.id}`,
      title: `${p.name} · ${p.date}`,
      text: [...bullets(p.bullets), ...(extra ? [`Tech: ${extra.technologies.join(', ')}`] : [])].join('\n'),
      sources: sources.slice(0, 3),
      aliases: ['project', ...(PROJECT_ALIASES[p.id] ?? [])],
    });
  }

  for (const c of RESUME.credentials) {
    const extra = DATA.credentials.find((d) => key(d.title) === key(c.name));
    const extraLinks: readonly { title: string; href: string }[] = extra?.links ?? [];
    out.push({
      id: `credential-${key(c.name).slice(0, 12)}`,
      title: `${c.name} · ${c.period}`,
      text: c.note,
      sources: [
        RESUME_SOURCE('Credentials'),
        ...extraLinks.map((l) => ({ kind: l.title.toLowerCase(), label: host(l.href) === 'github.com' ? lastSegment(l.href) : host(l.href), href: l.href })),
      ],
      aliases: ['credential'],
    });
  }

  const listed = Object.values(RESUME.skills).flat().map(key);
  for (const [group, items] of Object.entries(RESUME.skills)) {
    out.push({
      id: `skills-${key(group)}`,
      title: `Skills: ${group}`,
      text: items.join(', '),
      sources: [RESUME_SOURCE(`Skills: ${group}`)],
      aliases: ['skill'],
    });
  }
  // Skills the portfolio page lists and the résumé does not ("Tailwind" counts as "Tailwind CSS").
  const unlisted = DATA.skills.filter((s) => !listed.some((l) => l.startsWith(key(s))));
  if (unlisted.length) {
    out.push({ id: 'skills-portfolio', title: 'Skills: also on the portfolio', text: unlisted.join(', '), sources: [PORTFOLIO_SOURCE], aliases: ['skill'] });
  }

  out.push({
    id: 'contact',
    title: `Email ${EMAIL}`,
    text: [`GitHub: ${PROFILE_LINKS.github}`, `LinkedIn: ${PROFILE_LINKS.linkedin}`, `X: ${PROFILE_LINKS.x}`, `Website: ${PROFILE_LINKS.website}`].join('\n'),
    sources: [
      { kind: 'email', label: EMAIL, href: `mailto:${EMAIL}` },
      { kind: 'github', label: 'ayush-agrawal001', href: PROFILE_LINKS.github },
      { kind: 'linkedin', label: 'Ayush Agrawal', href: PROFILE_LINKS.linkedin },
    ],
    aliases: ['contact', 'social', 'twitter'],
  });

  for (const w of WRITEUPS) {
    w.text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).forEach((text, i) => {
      out.push({ id: `writeup-${w.projectId}-${i}`, title: w.title, text, sources: [w.source], aliases: ['project'] });
    });
  }

  return out;
}

export const PASSAGES: Passage[] = buildPassages();

/**
 * Hand-written answers, shown as they are when a visitor asks one of these questions.
 * EXAMPLES are the questions listed on the start screen; FAQ and PROJECT_FAQ below cover the rest
 * of what visitors are steered towards (chips, follow-ups, the Projects app, the app menu).
 */
export const EXAMPLES: Example[] = [
  {
    q: 'What did he build at Trench?',
    a: 'A spot + perps trading terminal, from scratch, wired to Hyperliquid’s APIs.',
    more: 'He was a Software Engineer Intern at Trench from April to August 2025. Besides the terminal, he polished the landing pages and reorganised the backend APIs by use case.',
    sources: [{ kind: 'résumé', label: 'Software Engineer Intern, Trench' }, { kind: 'website', label: 'trench.ag', href: 'https://www.trench.ag/' }],
    alt: ['What did he do at Trench?', 'Tell me about Trench', 'What was his work at Trench?'],
    next: ['What does he do at Botivate?', 'Does he do Web3?', 'What is his work experience?'],
  },
  {
    q: 'Is he actually good at Rust?',
    a: 'He wrote a credit-default-swap program for real-world assets in Rust + Anchor on Solana.',
    more: 'It tracks proposals, approvals and premium payments on-chain, and mints an NFT once the agreement is signed. He also finished Turbin3’s Solana builder cohort.',
    sources: [{ kind: 'github', label: 'Credit_default_swaps_RWA_Contract', href: PROJECT_LINKS['cds-rwa'].github }, { kind: 'résumé', label: 'Turbin3 Solana cohort' }],
    alt: ['Is he good at Rust?', 'Does he know Rust?', 'Can he write Rust?'],
    next: ['Tell me about the credit default swap project', 'Does he do Web3?', 'What certifications does he have?'],
  },
  {
    q: 'What is he up to right now?',
    a: 'He’s a backend intern at Botivate, since July 2026.',
    more: 'He builds APIs, database models and role-based access control for an HR workforce platform, while studying CS at BITS Pilani (class of 2027).',
    sources: [{ kind: 'résumé', label: 'Backend Developer Intern, Botivate' }, { kind: 'résumé', label: 'BITS Pilani, 2024 to 2027' }],
    alt: ['What is he doing right now?', 'What is he doing now?', 'What is he working on?', 'What is he working on right now?', 'Where does he work?'],
    next: ['What does he do at Botivate?', 'Where does he study?', 'Is he open to work?'],
  },
  {
    q: 'Show me something weird',
    a: 'ChainGenie: a Telegram bot that mints Solana tokens and NFTs from a chat message.',
    more: 'Built in November 2024, with minting and interaction flows wired straight to Solana, and security treated as a first-class feature.',
    sources: [{ kind: 'github', label: 'telegram_solana launchpad', href: PROJECT_LINKS.chaingenie.github }, { kind: 'video', label: 'Demo on YouTube', href: PROJECT_LINKS.chaingenie.video }],
    alt: ['Show me something cool', 'Show me something interesting', 'What is his weirdest project?'],
    next: ['What has he built?', 'Does he do Web3?', 'What is the invoice automation project?'],
  },
  {
    q: 'Can he do frontend too?',
    a: 'Yes. Zenqor’s marketing site is his: Next.js, Framer Motion, scroll-driven animations.',
    more: 'He also built the Trench landing pages, and the desktop you are clicking around in right now.',
    sources: [{ kind: 'github', label: 'zenqor', href: PROJECT_LINKS.zenqor.github }, { kind: 'résumé', label: 'Trench landing pages' }],
    alt: ['Can he do frontend?', 'Does he do frontend?', 'Is he good at frontend?', 'Does he know React?', 'Does he know Next.js?'],
    next: ['Tell me about Zenqor', 'What backend work has he done?', 'What is his stack?'],
  },
  {
    q: 'Can he center a div?',
    a: 'Flexbox, grid, and on dark days margin: auto.',
    more: 'Evidence: this entire desktop. I checked.',
    sources: [{ kind: 'this site', label: 'ayush-agrawal.in', href: PROFILE_LINKS.website }, { kind: 'résumé', label: 'Tailwind CSS, Framer Motion' }],
    alt: ['Can he centre a div?'],
    next: ['Can he do frontend too?', 'What is his stack?', 'How do I hire him?'],
  },
  {
    q: 'What is his stack?',
    a: 'TypeScript and Rust first, then Next.js, Node, Postgres, Docker and Kubernetes.',
    more: 'Plus Solidity, Python, Prisma, Socket.IO, and Google Apps Script when invoices get scary.',
    sources: [{ kind: 'résumé', label: 'Skills' }, { kind: 'github', label: 'ayush-agrawal001', href: PROFILE_LINKS.github }],
    alt: ['What is his tech stack?', 'What are his skills?', 'What languages does he know?', 'What technologies does he use?', 'What tech does he use?', 'What does he code in?'],
    next: ['What databases does he use?', 'What DevOps does he know?', 'Is he actually good at Rust?'],
  },
  {
    q: 'How do I hire him?',
    a: `Email ${RESUME.contact.email}. No sudo required.`,
    more: 'Or type sudo hire ayush in the terminal. It won’t work, but it’s fun.',
    sources: [{ kind: 'email', label: RESUME.contact.email, href: `mailto:${RESUME.contact.email}` }, { kind: 'linkedin', label: 'Ayush Agrawal', href: PROFILE_LINKS.linkedin }],
    alt: ['How can I hire him?', 'How to hire him?', 'Can I hire him?', 'I want to hire him'],
    next: ['Is he open to work?', 'Where can I see his résumé?', 'What is his work experience?'],
  },
];

/** General questions, offered as chips under the start-screen list. */
export const FAQ: Example[] = [
  {
    q: 'Who is Ayush?',
    alt: ['Who is he?', 'Tell me about Ayush', 'Tell me about him', 'Introduce Ayush'],
    a: 'A backend-focused developer and CS student at BITS Pilani who also ships Web3.',
    more: 'He’s a backend intern at Botivate, was a software engineering intern at Trench, and has built Solana programs, a wallet, a Telegram bot and a blogging platform along the way.',
    sources: [RESUME_SOURCE('Work experience'), RESUME_SOURCE('Projects'), { kind: 'github', label: 'ayush-agrawal001', href: PROFILE_LINKS.github }],
    next: ['What is his work experience?', 'What has he built?', 'What is his stack?'],
  },
  {
    q: 'What is his work experience?',
    alt: ['Where has he worked?', 'What experience does he have?', 'What is his experience?', 'Tell me about his experience', 'Tell me about his work experience'],
    a: 'Two internships: backend at Botivate now, and software engineering at Trench in 2025.',
    more: 'At Botivate (since July 2026) he builds APIs, database models and role-based access control for an HR workforce platform. At Trench (April to August 2025) he built a spot and perps trading terminal on Hyperliquid’s APIs.',
    sources: [RESUME_SOURCE('Backend Developer Intern, Botivate'), RESUME_SOURCE('Software Engineer Intern, Trench')],
    next: ['What does he do at Botivate?', 'What did he build at Trench?', 'What has he built?'],
  },
  {
    q: 'What does he do at Botivate?',
    alt: ['What did he build at Botivate?', 'Tell me about Botivate', 'What is he building at Botivate?', 'What is his work at Botivate?'],
    a: 'The backend of a workforce-management platform for HR operations.',
    more: 'He has been a Backend Developer Intern there since July 2026, implementing the APIs and database models, plus authentication and role-based access control.',
    sources: [RESUME_SOURCE('Backend Developer Intern, Botivate')],
    next: ['What backend work has he done?', 'What did he build at Trench?', 'What databases does he use?'],
  },
  {
    q: 'What has he built?',
    alt: ['What are his projects?', 'Show me his projects', 'What projects has he built?', 'What projects has he done?', 'Tell me about his projects', 'What has he made?'],
    a: 'Seven projects on the résumé, from Solana programs to a billing robot.',
    more: 'ChainGenie (a Telegram × Solana bot), Jagruk (a blogging platform), a credit-default-swap program in Rust, the Zenqor website, invoice automation, the Vault wallet and a WebRTC video-call app. The Projects app in the Dock lists them all.',
    sources: [RESUME_SOURCE('Projects'), { kind: 'github', label: 'ayush-agrawal001', href: PROFILE_LINKS.github }],
    next: ['Tell me about ChainGenie', 'Tell me about Jagruk', 'Tell me about the credit default swap project'],
  },
  {
    q: 'What backend work has he done?',
    alt: ['Is he good at backend?', 'Can he do backend?', 'Does he do backend?', 'Tell me about his backend work'],
    a: 'APIs, database models, authentication and role-based access control.',
    more: 'That is his job at Botivate, and at Trench he organised the backend APIs by use case. Jagruk runs on Node/Express and PostgreSQL, and his toolbox includes Axum, Prisma and MongoDB.',
    sources: [RESUME_SOURCE('Work experience'), RESUME_SOURCE('Skills: Backend Frameworks'), { kind: 'github', label: 'Jagruk.life', href: PROJECT_LINKS.jagruk.github }],
    next: ['What databases does he use?', 'What DevOps does he know?', 'What does he do at Botivate?'],
  },
  {
    q: 'Does he do Web3?',
    alt: ['What Web3 work has he done?', 'Does he know Solana?', 'Does he know blockchain?', 'Does he do blockchain?', 'Does he know Solidity?', 'Tell me about his Web3 work'],
    a: 'Yes: Solana programs in Rust and Anchor, a wallet, and a Telegram minting bot.',
    more: 'He also integrated Hyperliquid’s trading APIs at Trench, knows Solidity, and completed Turbin3’s Solana builder cohort and the blockchain part of 100xDevs.',
    sources: [{ kind: 'github', label: 'Credit_default_swaps_RWA_Contract', href: PROJECT_LINKS['cds-rwa'].github }, { kind: 'github', label: 'SOL_WALLET', href: PROJECT_LINKS['sol-wallet'].github }, RESUME_SOURCE('Credentials')],
    next: ['Tell me about the credit default swap project', 'What is the Vault wallet?', 'Tell me about ChainGenie'],
  },
  {
    q: 'What databases does he use?',
    alt: ['Does he know PostgreSQL?', 'Does he know Postgres?', 'Does he know SQL?', 'Does he know MongoDB?', 'What databases does he know?'],
    a: 'PostgreSQL and MongoDB, usually through Prisma.',
    more: 'SQL and NoSQL both, plus Firestore. Jagruk’s backend runs on PostgreSQL, and database models are part of his work at Botivate.',
    sources: [RESUME_SOURCE('Skills: Databases'), RESUME_SOURCE('Backend Developer Intern, Botivate')],
    next: ['What backend work has he done?', 'What DevOps does he know?', 'Tell me about Jagruk'],
  },
  {
    q: 'What DevOps does he know?',
    alt: ['Does he know Docker?', 'Does he know Kubernetes?', 'Does he know AWS?', 'Does he know DevOps?', 'Does he know cloud?'],
    a: 'Docker, Kubernetes, Linux, AWS, GCP and Cloudflare Workers, plus CI/CD.',
    more: 'He also completed the DevOps part of the 100xDevs cohort.',
    sources: [RESUME_SOURCE('Skills: Cloud & DevOps'), RESUME_SOURCE('100xDevs cohort')],
    next: ['What is his stack?', 'What certifications does he have?', 'What backend work has he done?'],
  },
  {
    q: 'Where does he study?',
    alt: ['Where did he study?', 'What is his education?', 'What does he study?', 'Which college does he go to?', 'What is his degree?', 'Tell me about his education'],
    a: 'Computer Science at BITS Pilani, 2024 to 2027.',
    more: 'He is doing his bachelor’s at the Birla Institute of Technology and Science, Pilani, alongside his internship at Botivate.',
    sources: [RESUME_SOURCE('Education')],
    next: ['What certifications does he have?', 'What is he up to right now?', 'What is his work experience?'],
  },
  {
    q: 'What certifications does he have?',
    alt: ['What courses has he done?', 'What are his credentials?', 'Does he have any certifications?', 'What cohorts has he done?'],
    a: 'Two cohorts: 100xDevs and Turbin3.',
    more: 'He completed the 100xDevs cohort covering web development, DevOps and blockchain, and was selected for Turbin3’s Solana Async Builder cohort in 2025, with hands-on Rust and Anchor assignments.',
    sources: [RESUME_SOURCE('Credentials')],
    next: ['Is he actually good at Rust?', 'Where does he study?', 'Does he do Web3?'],
  },
  {
    q: 'Is he open to work?',
    alt: ['Is he available?', 'Is he looking for a job?', 'Is he available for hire?', 'Is he looking for work?', 'Is he open to opportunities?', 'Is he available for work?'],
    a: 'Yes. The status light at the top of this desktop says so.',
    more: `He is interning at Botivate and finishes his degree in 2027. The quickest way to start a conversation is an email to ${EMAIL}.`,
    sources: [{ kind: 'email', label: EMAIL, href: `mailto:${EMAIL}` }, { kind: 'linkedin', label: 'Ayush Agrawal', href: PROFILE_LINKS.linkedin }],
    next: ['How do I hire him?', 'What is his work experience?', 'Where can I see his résumé?'],
  },
  {
    q: 'How do I contact him?',
    alt: ['How can I contact him?', 'What is his email?', 'How do I reach him?', 'How can I reach him?', 'Where can I find him?', 'What are his socials?', 'What is his GitHub?', 'What is his LinkedIn?'],
    a: `Email ${EMAIL}.`,
    more: 'He is also on GitHub, LinkedIn and X. The links are just below.',
    sources: [{ kind: 'email', label: EMAIL, href: `mailto:${EMAIL}` }, { kind: 'github', label: 'ayush-agrawal001', href: PROFILE_LINKS.github }, { kind: 'linkedin', label: 'Ayush Agrawal', href: PROFILE_LINKS.linkedin }],
    next: ['Is he open to work?', 'How do I hire him?', 'Where can I see his résumé?'],
  },
  {
    q: 'Where can I see his résumé?',
    alt: ['Can I see his résumé?', 'Show me his résumé', 'Where is his résumé?', 'Do you have his résumé?', 'Can I download his résumé?', 'Show me his CV', 'Where is his CV?'],
    a: 'Click Résumé in the Dock, or type resume in the terminal.',
    more: 'The Résumé icon opens the classic version of this portfolio. Everything this app says comes from that same document.',
    sources: [{ kind: 'this site', label: 'Résumé', href: '/portfolio' }],
    next: ['What is his work experience?', 'What has he built?', 'How do I contact him?'],
  },
];

/** One answer per project: what the Projects app and the app menu's "now shipping" card ask. */
export const PROJECT_FAQ: Example[] = [
  {
    q: 'Tell me about ChainGenie',
    alt: ['What is ChainGenie?', 'ChainGenie', 'Tell me about the Telegram bot'],
    a: 'ChainGenie is a Telegram bot for creating and managing Solana tokens and NFTs without leaving the chat.',
    more: 'Built in November 2024. Its minting and interaction flows talk straight to Solana, and the bot was designed around security, usability and automation.',
    sources: [{ kind: 'github', label: 'telegram_solana launchpad', href: PROJECT_LINKS.chaingenie.github }, { kind: 'video', label: 'Demo on YouTube', href: PROJECT_LINKS.chaingenie.video }],
    next: ['What is the Vault wallet?', 'Does he do Web3?', 'Tell me about Jagruk'],
  },
  {
    q: 'Tell me about Jagruk',
    alt: ['What is Jagruk?', 'Jagruk', 'Tell me about the blogging platform'],
    a: 'Jagruk is a collaborative blogging platform where writers connect, discuss projects and work together.',
    more: 'Built in December 2024: React on the front, Node/Express and PostgreSQL behind it, sign-in with Google and GitHub OAuth, and a social layer of follows and content sharing.',
    sources: [{ kind: 'github', label: 'Jagruk.life', href: PROJECT_LINKS.jagruk.github }, { kind: 'live', label: 'jagruklife.vercel.app', href: PROJECT_LINKS.jagruk.demo }, { kind: 'video', label: 'Demo on YouTube', href: PROJECT_LINKS.jagruk.video }],
    next: ['What backend work has he done?', 'Can he do frontend too?', 'Tell me about his video call app'],
  },
  {
    q: 'Tell me about the credit default swap project',
    alt: ['What is the credit default swap project?', 'What is the CDS project?', 'Tell me about CDS for RWAs', 'Tell me about the CDS project', 'Tell me about his Rust project'],
    a: 'A Solana program, in Rust and Anchor, that models a credit default swap for real-world assets.',
    more: 'Written in September 2025. Program-derived accounts track proposal, approval and premium-payment state on-chain, and an NFT is minted to represent the agreement once it is approved.',
    sources: [{ kind: 'github', label: 'Credit_default_swaps_RWA_Contract', href: PROJECT_LINKS['cds-rwa'].github }],
    next: ['Is he actually good at Rust?', 'Does he do Web3?', 'What certifications does he have?'],
  },
  {
    q: 'Tell me about Zenqor',
    alt: ['What is Zenqor?', 'Zenqor', 'Tell me about the Zenqor site', 'Tell me about the Zenqor website'],
    a: 'Zenqor’s marketing website, which he built as freelance work in March 2025.',
    more: 'Next.js and Framer Motion, with scroll-driven animations and page transitions. It is fully responsive across the home, about, solutions, technology and contact pages.',
    sources: [{ kind: 'github', label: 'zenqor', href: PROJECT_LINKS.zenqor.github }],
    next: ['Can he do frontend too?', 'What has he built?', 'What is his stack?'],
  },
  {
    q: 'What is the invoice automation project?',
    alt: ['Tell me about the invoice automation', 'Tell me about the invoice automation project', 'Tell me about the invoice robot', 'What is the invoice robot?'],
    a: 'A Google Apps Script that turns rows in a Google Sheet into invoices, with nobody typing them up.',
    more: 'Built in November 2024. It validates PAN and GSTIN tax IDs, splits amounts over ₹50,000 into compliant chunks, calls an external invoicing API, and writes each invoice link and status back to the sheet.',
    sources: [{ kind: 'github', label: 'gscript-automating-invoices', href: PROJECT_LINKS['invoice-automation'].github }],
    next: ['What has he built?', 'What backend work has he done?', 'Show me something weird'],
  },
  {
    q: 'What is the Vault wallet?',
    alt: ['Tell me about the Vault wallet', 'Tell me about Vault', 'What is Vault?', 'Tell me about his wallet'],
    a: 'Vault is a Web3 wallet for Solana, built in React and TypeScript.',
    more: 'From September 2024. He implemented its key management and its transaction-signing flows.',
    sources: [{ kind: 'github', label: 'SOL_WALLET', href: PROJECT_LINKS['sol-wallet'].github }, { kind: 'live', label: 'sol-wallet', href: PROJECT_LINKS['sol-wallet'].demo }, { kind: 'video', label: 'Demo on YouTube', href: PROJECT_LINKS['sol-wallet'].video }],
    next: ['Does he do Web3?', 'Tell me about ChainGenie', 'Tell me about the credit default swap project'],
  },
  {
    q: 'Tell me about his video call app',
    alt: ['What is the video call app?', 'Tell me about the video call app', 'Tell me about video calls', 'What is his video call app?'],
    a: 'A real-time video calling app built on WebRTC and Socket.IO.',
    more: 'From October 2024. He implemented the signaling, connection management and audio/video streaming for low-latency peer-to-peer calls.',
    sources: [{ kind: 'github', label: 'Video-chat-app', href: PROJECT_LINKS.videocall.github }, { kind: 'video', label: 'Demo on YouTube', href: PROJECT_LINKS.videocall.video }],
    next: ['Tell me about Jagruk', 'What backend work has he done?', 'What has he built?'],
  },
];

/** Who answers in the Ask Ayush window. */
export const ASSISTANT = { name: 'Koby', role: 'Ayush’s assistant' };

/**
 * Questions about Koby rather than about Ayush, plus small talk. Koby speaks in the first person:
 * warm, brief, a little dry, and honest about what it is (the model's voice is set in prompt.ts).
 * These are answered when typed but never offered as follow-ups.
 */
export const KOBY_FAQ: Example[] = [
  {
    q: 'Who are you?',
    alt: ['What are you?', 'What is your name?', 'Who is Koby?', 'Who is this?', 'Who am I talking to?', 'Introduce yourself', 'Tell me about yourself', 'Tell me about Koby'],
    a: `I’m ${ASSISTANT.name}, ${ASSISTANT.role}.`,
    more: 'I keep his résumé and portfolio on file and answer questions about his work while he’s off building things. I’m on his side, obviously, but I only repeat what’s actually written down.',
    sources: [],
    next: ['What is this?', 'Who is Ayush?', 'What has he built?'],
  },
  {
    q: 'What is this?',
    alt: ['What is this app?', 'What is this site?', 'What is this website?', 'What is this place?', 'What can you do?', 'What do you do?', 'What can I ask?', 'What can I ask you?', 'How does this work?', 'How do you work?', 'Help', 'Who built this?', 'Who made this?', 'Did he build this?', 'Did he build this site?', 'Did he build this website?'],
    a: 'Ayush’s portfolio, dressed up as a tiny desktop he built himself. This window is where you ask me about him.',
    more: 'Type a question about his work, projects, skills or how to reach him. I answer from his résumé and portfolio and nothing else. If it isn’t in there, I’ll tell you instead of guessing.',
    sources: [{ kind: 'this site', label: 'Résumé', href: '/portfolio' }],
    next: ['What is his work experience?', 'What has he built?', 'What is his stack?'],
  },
  {
    q: 'Are you an AI?',
    alt: ['Are you AI?', 'Is this AI?', 'Is this an AI?', 'Are you a bot?', 'Are you a robot?', 'Are you a chatbot?', 'Are you real?', 'Are you human?', 'Are you a human?', 'Are you a person?', 'Are you ChatGPT?', 'Are you Claude?', 'Are you an LLM?'],
    a: 'Partly. Some of me is Ayush’s own writing, the rest is an AI on a short leash.',
    more: 'The common questions have answers Ayush wrote himself. Anything else goes to an AI model that has been handed his résumé and portfolio and told to stick to them, so it won’t help with your homework. If something isn’t on file, I say so.',
    sources: [],
    next: ['What is this?', 'Who is Ayush?', 'How do I hire him?'],
  },
  {
    q: 'Hello',
    alt: ['Hi', 'Hey', 'Yo', 'Sup', 'Hi there', 'Hello there', 'Koby', 'Hello Koby', 'Good morning', 'Good afternoon', 'Good evening'],
    a: `Hello! ${ASSISTANT.name} here, ${ASSISTANT.role}.`,
    more: 'Ask me about his work, his projects, his stack or how to hire him. I’ve got the résumé open.',
    sources: [],
    next: ['Who is Ayush?', 'What is his work experience?', 'What has he built?'],
  },
  {
    q: 'Thanks',
    alt: ['Thank you', 'Thanks Koby', 'Thank you Koby', 'Thx', 'Cheers', 'Great, thanks', 'Ok thanks'],
    a: 'Any time.',
    more: `If you liked what you saw, the next step is an email to ${EMAIL}. I’ll put in a good word.`,
    sources: [{ kind: 'email', label: EMAIL, href: `mailto:${EMAIL}` }],
    next: ['How do I hire him?', 'Is he open to work?', 'Where can I see his résumé?'],
  },
];

export type ProjectCard ={ name: string; tag: string; question: string; color: string; initials: string; folder: string; desc: string };

export const PROJECTS: ProjectCard[] = [
  { name: 'Trench terminal', folder: 'trench-terminal', desc: 'Trading terminal · work', tag: 'work · hyperliquid', question: 'What did he build at Trench?', color: '#98BB6C', initials: 'TT' },
  { name: 'Botivate HR', folder: 'botivate-hr', desc: 'HR platform API · work', tag: 'work · rbac', question: 'What is he up to right now?', color: '#7E9CD8', initials: 'BH' },
  { name: 'ChainGenie', folder: 'chaingenie', desc: 'Telegram × Solana bot', tag: 'telegram × solana', question: 'Tell me about ChainGenie', color: '#D27E99', initials: 'CG' },
  { name: 'Jagruk', folder: 'jagruk', desc: 'Blogging platform', tag: 'react · postgres', question: 'Tell me about Jagruk', color: '#FFA066', initials: 'JG' },
  { name: 'CDS for RWAs', folder: 'cds-rwa', desc: 'Rust + Anchor program', tag: 'rust · anchor', question: 'Is he actually good at Rust?', color: '#E46876', initials: 'CD' },
  { name: 'Vault wallet', folder: 'vault', desc: 'Solana wallet', tag: 'solana · ts', question: 'What is the Vault wallet?', color: '#7FB4CA', initials: 'VW' },
  { name: 'Zenqor site', folder: 'zenqor', desc: 'Client website', tag: 'next · framer', question: 'Can he do frontend too?', color: '#E6C384', initials: 'ZQ' },
  { name: 'Invoice robot', folder: 'invoice-bot', desc: 'Billing automation', tag: 'apps script', question: 'What is the invoice automation project?', color: '#7E9CD8', initials: 'IR' },
  { name: 'Video calls', folder: 'video-call', desc: 'WebRTC video calls', tag: 'webrtc · socket.io', question: 'Tell me about his video call app', color: '#98BB6C', initials: 'VC' },
];
