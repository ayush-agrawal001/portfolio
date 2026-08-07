/** Resume data sourced from resume.md */

export const RESUME = {
  name: 'Ayush Agrawal',
  contact: {
    phone: '+91 9575074847',
    email: 'ayushagrawal4376@gmail.com',
    website: 'ayush-agrawal.in',
    websiteUrl: 'https://ayush-agrawal.in',
  },
  work: [
    {
      title: 'Backend Developer (Intern)',
      company: 'Botivate',
      period: 'July 2026 – Present',
      bullets: [
        'Developing an external workforce management platform for HR operations.',
        'Implementing backend APIs and database models for the platform.',
        'Building authentication and role-based access control (RBAC).',
      ],
    },
    {
      title: 'Software Engineer Intern',
      company: 'Trench',
      period: '15 April 2025 – 1 Aug 2025',
      bullets: [
        'Developed and optimized landing pages with a strong focus on UI engineering and UX.',
        'Integrated Hyperliquid APIs to enable trading functionality on the platform.',
        'Built a trading terminal from scratch for spot and perpetual trading workflows.',
        'Designed and organized backend APIs by functionality and use case.',
      ],
    },
  ],
  education: [
    {
      degree: "Bachelor's Degree in Computer Science",
      school: 'Birla Institute of Technology And Science, Pilani (BITS Pilani)',
      period: '08/2024 – 05/2027',
    },
  ],
  projects: [
    {
      id: 'chaingenie',
      name: 'ChainGenie',
      date: 'Nov 2024',
      links: ['Video', 'Github'],
      bullets: [
        'Built a secure Web3 Telegram bot that lets users create and manage Solana tokens and NFTs directly from Telegram.',
        'Implemented minting and interaction workflows integrated with the Solana blockchain.',
        'Designed the bot architecture with a focus on security, usability, and automation.',
      ],
    },
    {
      id: 'jagruk',
      name: 'Jagruk',
      date: 'Dec 2024',
      links: ['Video', 'Github', 'Website'],
      bullets: [
        'Built a collaborative blogging platform for bloggers to connect, discuss projects, and work together.',
        'Implemented secure authentication using Google and GitHub OAuth.',
        'Built the social layer (follows, content sharing) across a React frontend and a Node/Express + PostgreSQL backend.',
      ],
    },
    {
      id: 'cds-rwa',
      name: 'Credit Default Swap — RWA Program',
      date: 'Sep 2025',
      links: ['Github'],
      bullets: [
        'Wrote a Solana on-chain program (Rust + Anchor) modeling a credit default swap agreement for real-world assets.',
        'Used program-derived accounts (PDAs) to track proposal, approval, and premium-payment state on-chain.',
        "Minted an NFT via Anchor's SPL token interface to represent the signed agreement once approved.",
      ],
    },
    {
      id: 'zenqor',
      name: 'Zenqor — Client Website',
      date: 'Mar 2025',
      links: ['Github'],
      bullets: [
        'Built the marketing website for Zenqor as freelance/contract work.',
        'Implemented scroll-driven animations and page transitions using Next.js and Framer Motion.',
        'Delivered a fully responsive, production-ready site across home, about, solutions, technology, and contact pages.',
      ],
    },
    {
      id: 'invoice-automation',
      name: 'Invoice & Billing Automation',
      date: 'Nov 2024',
      links: ['Github'],
      bullets: [
        'Automated invoice generation and billing using Google Apps Script wired to Google Sheets and an external invoicing API.',
        'Validated customer PAN/GSTIN tax IDs and auto-split amounts over ₹50,000 into compliant chunks.',
        'Removed manual invoice creation — invoice links and status are written back to the sheet automatically.',
      ],
    },
    {
      id: 'sol-wallet',
      name: 'Web3 Wallet - Vault',
      date: 'Sep 2024',
      links: ['Video', 'Github', 'Website'],
      bullets: [
        'Built a secure Web3 wallet with seamless integration with the Solana blockchain.',
        'Implemented key management and transaction signing flows in React + TypeScript.',
      ],
    },
    {
      id: 'videocall',
      name: 'Video-call Web App',
      date: 'Oct 2024',
      links: ['Video', 'Github'],
      bullets: [
        'Built a real-time video calling platform using WebRTC and Socket.IO for low-latency peer-to-peer communication.',
        'Implemented signaling, connection management, and audio/video streaming.',
      ],
    },
  ],
  credentials: [
    {
      name: '100xDevs — Complete Web Dev, DevOps & Blockchain Cohort',
      period: 'Completed',
      note: "Completed 100xDevs' full cohort covering web development, DevOps, and blockchain engineering end-to-end.",
    },
    {
      name: 'Turbin3 — Solana Async Builder Cohort',
      period: '2025',
      note: "Selected for Turbin3's Solana Async Builder cohort — completed hands-on Rust/Anchor program-building assignments.",
    },
  ],
  skills: {
    Languages: ['Rust', 'C', 'TypeScript', 'Python', 'Solidity', 'JavaScript', 'Matplotlib', 'Pandas', 'NumPy'],
    'Frontend Frameworks': ['Next.js', 'Tailwind CSS', 'React.js', 'Zustand', 'Recoil', 'Framer Motion'],
    'Backend Frameworks': ['Node.js', 'Express.js', 'Axios.js', 'Axum', 'Socket.IO', 'OAuth'],
    'Cloud & DevOps': ['GCP', 'AWS', 'Cloudflare Workers', 'Docker', 'Linux', 'Kubernetes (K8s)', 'Firestore'],
    Databases: ['SQL', 'NoSQL', 'PostgreSQL', 'MongoDB', 'Prisma ORM'],
    Automation: ['Google Apps Script', 'CI/CD'],
  },
} as const;

export function formatContact(): string[] {
  const { contact, name } = RESUME;
  return [
    name,
    '',
    `  Phone   : ${contact.phone}`,
    `  Email   : ${contact.email}`,
    `  Website : ${contact.websiteUrl}`,
  ];
}

export function formatExperience(index?: number): string[] {
  const jobs = RESUME.work;
  if (index !== undefined) {
    const job = jobs[index];
    if (!job) return [`experience: no entry at index ${index} (use 0–${jobs.length - 1})`];
    return formatJob(job, index);
  }
  const lines: string[] = ['Work Experience', ''];
  jobs.forEach((job, i) => {
    lines.push(`  [${i}] ${job.title} — ${job.company}`);
    if ('period' in job && job.period) lines.push(`      ${job.period}`);
  });
  lines.push('', "Type 'experience <n>' for full details (e.g. experience 0)");
  return lines;
}

function formatJob(job: (typeof RESUME.work)[number], index: number): string[] {
  const lines: string[] = [
    `[${index}] ${job.title} — ${job.company}`,
  ];
  if ('type' in job && job.type) lines.push(`    ${job.type}`);
  if ('period' in job && job.period) lines.push(`    ${job.period}`);
  lines.push('');
  job.bullets.forEach((b) => lines.push(`  • ${b}`));
  return lines;
}

export function formatEducation(): string[] {
  const lines: string[] = ['Education', ''];
  for (const edu of RESUME.education) {
    lines.push(`  ${edu.degree}`);
    lines.push(`  ${edu.school}`);
    lines.push(`  ${edu.period}`);
    lines.push('');
  }
  return lines.slice(0, -1);
}

export function formatProjects(): string[] {
  const lines: string[] = ['Projects', ''];
  for (const p of RESUME.projects) {
    const linkStr = p.links.length ? ` (${p.links.join(', ')})` : '';
    lines.push(`  ${p.name} — ${p.date}${linkStr}`);
    lines.push(`    id: ${p.id}`);
  }
  lines.push('', "Type 'project <id>' for details (e.g. project jagruk)");
  return lines;
}

export function formatProject(idOrName: string): string[] {
  const q = idOrName.toLowerCase().replace(/\s+/g, '');
  const project = RESUME.projects.find(
    (p) => p.id === q || p.name.toLowerCase().replace(/\s+/g, '') === q,
  );
  if (!project) {
    return [
      `project: '${idOrName}' not found.`,
      `Available: ${RESUME.projects.map((p) => p.id).join(', ')}`,
    ];
  }
  const lines: string[] = [
    project.name,
    `  Date  : ${project.date}`,
    `  Links : ${project.links.join(', ') || '—'}`,
    '',
  ];
  if (project.bullets.length > 0) {
    project.bullets.forEach((b) => lines.push(`  • ${b}`));
  } else {
    lines.push('  (no description in resume)');
  }
  return lines;
}

export function formatSkills(category?: string): string[] {
  const cats = RESUME.skills as Record<string, readonly string[]>;
  if (category) {
    const key = Object.keys(cats).find((k) => k.toLowerCase() === category.toLowerCase());
    if (!key) {
      return [
        `skills: unknown category '${category}'`,
        `Categories: ${Object.keys(cats).join(', ')}`,
      ];
    }
    return [`${key}:`, '', ...cats[key].map((s) => `  ${s}`)];
  }
  const lines: string[] = ['Skills', ''];
  for (const [cat, items] of Object.entries(cats)) {
    lines.push(`  ${cat}`);
    lines.push(`    ${items.join(' · ')}`);
    lines.push('');
  }
  lines.push("Type 'skills <category>' for one section (e.g. skills languages)");
  return lines.slice(0, -1);
}

export function formatResumeFull(): string[] {
  return [
    ...formatContact(),
    '',
    '─'.repeat(40),
    '',
    ...formatExperience(),
    '',
    '─'.repeat(40),
    '',
    ...formatEducation(),
    '',
    '─'.repeat(40),
    '',
    ...formatProjects(),
    '',
    '─'.repeat(40),
    '',
    ...formatSkills(),
  ];
}

/** Plain-text resume.md style output for `cat resume.md` */
export function formatResumeMarkdown(): string[] {
  const { contact, name } = RESUME;
  const lines: string[] = [
    `# ${name}`,
    '',
    `Phone: ${contact.phone}`,
    `Email: ${contact.email}`,
    `Web:   ${contact.website}`,
    '',
    '# Work Experience',
    '',
  ];

  for (const job of RESUME.work) {
    lines.push(`## ${job.title} — ${job.company}`);
    if ('type' in job && job.type) lines.push(`### ${job.type}`);
    if ('period' in job && job.period) lines.push(`**${job.period}**`);
    lines.push('');
    job.bullets.forEach((b) => lines.push(`- ${b}`));
    lines.push('');
  }

  lines.push('# Education', '');
  for (const edu of RESUME.education) {
    lines.push(`## ${edu.degree}`);
    lines.push(`### ${edu.school}`);
    lines.push(`**${edu.period}**`);
    lines.push('');
  }

  lines.push('# Projects', '');
  for (const p of RESUME.projects) {
    lines.push(`## ${p.name}`);
    lines.push(`**${p.date}**`);
    if (p.links.length) lines.push(`Links: ${p.links.join(', ')}`);
    lines.push('');
    p.bullets.forEach((b) => lines.push(`- ${b}`));
    lines.push('');
  }

  lines.push('# Skills', '');
  for (const [cat, items] of Object.entries(RESUME.skills)) {
    lines.push(`## ${cat}`);
    items.forEach((s) => lines.push(`- ${s}`));
    lines.push('');
  }

  return lines;
}
