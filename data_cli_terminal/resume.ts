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
      title: 'Product Engineer',
      company: 'Secure Global Technologies',
      type: 'Freelance Experience',
      bullets: [
        'Developed smart contracts for their BNB Chain infrastructure.',
        'Resolved frontend issues and improved the overall user experience for customers.',
        'Built a custom CMS from scratch for administrative and content management operations.',
        'Developed and optimized landing pages with a strong focus on UI engineering and user experience.',
        'Integrated APIs from Hyperliquid into the platform to enable trading functionalities.',
        'Built a trading terminal from scratch for spot and perpetual trading workflows.',
        'Contributed to backend development by designing and organizing APIs based on their functionality and use cases.',
      ],
    },
    {
      title: 'Software Engineer Intern',
      company: 'Trench',
      period: '15 April 2025 – 1 Aug 2025',
      bullets: [
        'Built a secure Web3 Telegram bot for creating and managing tokens on the Solana blockchain.',
        'Developed NFT creation and interaction features, enabling users to mint and manage digital assets directly through Telegram.',
        'Designed and integrated blockchain interaction workflows with a focus on security, usability, and automation.',
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
      date: 'Dec 2024',
      links: ['Video', 'Github'],
      bullets: [
        'Built a collaborative platform for bloggers to connect, discuss projects, and work together.',
        'Implemented secure authentication using Google and GitHub OAuth.',
        'Developed social and content-sharing features including following users, publishing posts, and community interaction tools.',
      ],
    },
    {
      id: 'jagruk',
      name: 'Jagruk',
      date: 'Dec 2024',
      links: ['Video', 'Github', 'Website'],
      bullets: [
        'Built a real-time video calling platform using WebRTC and Socket.IO for low-latency peer-to-peer communication.',
        'Implemented video/audio streaming, connection management, and real-time signaling workflows.',
        'Developed scalable communication features with a focus on performance, reliability, and seamless user interaction.',
      ],
    },
    {
      id: 'videocall',
      name: 'Video-call Web App',
      date: '2024',
      links: ['Video', 'Github'],
      bullets: [] as string[],
    },
  ],
  skills: {
    Languages: ['Rust', 'C', 'TypeScript', 'Python', 'Solidity', 'JavaScript', 'Matplotlib', 'Pandas', 'NumPy'],
    'Frontend Frameworks': ['Next.js', 'Tailwind CSS', 'React.js', 'Zustand', 'Recoil'],
    'Backend Frameworks': ['Node.js', 'Axios.js', 'Axum', 'Socket.IO', 'OAuth'],
    'Cloud & DevOps': ['GCP', 'AWS', 'Cloudflare Workers', 'Docker', 'Linux', 'Kubernetes (K8s)', 'Firestore'],
    Databases: ['SQL', 'NoSQL', 'PostgreSQL', 'MongoDB', 'Prisma ORM'],
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
  if (project.bullets.length === 0) {
    lines.push('  (no description in resume)');
  } else {
    project.bullets.forEach((b) => lines.push(`  • ${b}`));
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
