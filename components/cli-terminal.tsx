'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  RESUME,
  formatContact,
  formatEducation,
  formatExperience,
  formatProject,
  formatProjects,
  formatResumeFull,
  formatResumeMarkdown,
  formatSkills,
} from '@/data_cli_terminal/resume';

interface CliTerminalProps {
  asciiArt: string;
}

interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'success' | 'info' | 'prompt-line1';
  content: string;
}

const PROMPT_LINE1 = `┌──(bunny㉿portfolio)-[~]`;
const PROMPT_LINE2 = `└─$ `;

const ALL_COMMANDS = [
  'help',
  'about',
  'resume',
  'contact',
  'experience',
  'work',
  'education',
  'edu',
  'projects',
  'project',
  'skills',
  'cat',
  'whoami',
  'date',
  'echo',
  'calc',
  'ls',
  'pwd',
  'weather',
  'color',
  'clear',
  'openuiportfolio',
  'exit',
];

const DEVELOPER_INFO = [
  `Developer   : ${RESUME.name}`,
  `Role        : Product Engineer · Full-Stack · Web3`,
  `Contact     : ${RESUME.contact.email}`,
  `Website     : ${RESUME.contact.website}`,
  'Resume      : type resume, contact, experience, projects, skills',
  'Help        : type help to list all commands',
];

const COMMANDS: Record<string, { description: string; execute: (args: string[]) => string | string[] }> = {
  help: {
    description: 'Display available commands',
    execute: () => [
      'Available commands:',
      '',
      '  Resume & profile',
      '  resume              - Full resume (all sections)',
      '  contact             - Phone, email, website',
      '  experience [n]      - Work experience (optional index)',
      '  work [n]            - Alias for experience',
      '  education           - Education history',
      '  edu                 - Alias for education',
      '  projects            - List all projects',
      '  project <id>        - Project details (chaingenie, jagruk, videocall)',
      '  skills [category]   - Skills by category',
      '  cat resume.md       - View resume as markdown',
      '',
      '  General',
      '  about               - About this terminal',
      '  whoami              - Current user',
      '  date                - Current date and time',
      '  echo <text>         - Echo text',
      '  calc <expr>         - Calculate expression',
      '  ls                  - List files',
      '  pwd                 - Print working directory',
      '  weather [city]      - Weather demo',
      '  color               - Tokyo Night palette',
      '  clear               - Clear terminal',
      '  openuiportfolio     - Open animated portfolio UI',
      '  exit                - Exit terminal',
      '',
      'Use ↑/↓ for history · Tab to autocomplete',
    ],
  },
  resume: {
    description: 'Display full resume',
    execute: () => formatResumeFull(),
  },
  contact: {
    description: 'Show contact information',
    execute: () => formatContact(),
  },
  experience: {
    description: 'Show work experience',
    execute: (args) => {
      const idx = args[0] !== undefined ? parseInt(args[0], 10) : undefined;
      if (args[0] !== undefined && Number.isNaN(idx)) {
        return `experience: invalid index '${args[0]}'`;
      }
      return formatExperience(idx);
    },
  },
  work: {
    description: 'Alias for experience',
    execute: (args) => COMMANDS.experience.execute(args),
  },
  education: {
    description: 'Show education',
    execute: () => formatEducation(),
  },
  edu: {
    description: 'Alias for education',
    execute: () => formatEducation(),
  },
  projects: {
    description: 'List projects',
    execute: () => formatProjects(),
  },
  project: {
    description: 'Show project details',
    execute: (args) => {
      if (!args.length) {
        return ["usage: project <id>", `ids: ${RESUME.projects.map((p) => p.id).join(', ')}`];
      }
      return formatProject(args.join(' '));
    },
  },
  skills: {
    description: 'Show skills',
    execute: (args) => formatSkills(args.join(' ') || undefined),
  },
  cat: {
    description: 'Print file contents',
    execute: (args) => {
      const file = args[0]?.toLowerCase();
      if (!file) return 'usage: cat <file>';
      if (file === 'resume.md') return formatResumeMarkdown();
      return `cat: ${args[0]}: No such file or directory`;
    },
  },
  about: {
    description: 'Show information about this terminal',
    execute: () => [
      'Terminal Portfolio v2.0',
      `Profile  : ${RESUME.name} — Product Engineer & Web3 Developer`,
      'Theme    : Tokyo Night · GNOME-style desktop',
      'Stack    : Next.js, React, TypeScript, Tailwind CSS',
      '',
      "Type 'resume' or 'help' to explore Ayush's profile.",
    ],
  },
  date: {
    description: 'Show current date and time',
    execute: () => new Date().toString(),
  },
  whoami: {
    description: 'Display current user',
    execute: () => 'ayush',
  },
  echo: {
    description: 'Echo text to terminal',
    execute: (args) => args.join(' ') || '',
  },
  calc: {
    description: 'Calculate mathematical expressions',
    execute: (args) => {
      try {
        const expression = args.join('');
        const result = Function(`return ${expression}`)();
        return `${expression} = ${result}`;
      } catch {
        return 'error: invalid expression';
      }
    },
  },
  ls: {
    description: 'List directory contents',
    execute: () => [
      'drwxr-xr-x  ayush ayush  projects/',
      'drwxr-xr-x  ayush ayush  portfolio-ui/',
      '-rw-r--r--  ayush ayush  resume.md',
      '-rw-r--r--  ayush ayush  README.md',
      '-rw-r--r--  ayush ayush  contact.txt',
    ],
  },
  pwd: {
    description: 'Print working directory',
    execute: () => '/home/ayush/portfolio',
  },
  weather: {
    description: 'Show weather information',
    execute: (args) => {
      const city = args.join(' ') || 'Pilani';
      return [
        `Weather in ${city}:`,
        '  Temperature: 32°C (90°F)',
        '  Condition: Clear',
        '  Humidity: 28%',
      ];
    },
  },
  color: {
    description: 'Display color palette',
    execute: () => [
      'Tokyo Night palette:',
      '  background : #1a1b2e',
      '  foreground : #c0caf5',
      '  blue       : #7aa2f7',
      '  green      : #9ece6a',
      '  cyan       : #7dcfff',
      '  purple     : #bb9af7',
      '  yellow     : #e0af68',
      '  red        : #f7768e',
    ],
  },
  clear: {
    description: 'Clear the terminal',
    execute: () => '',
  },
  exit: {
    description: 'Exit the terminal',
    execute: () => 'Goodbye!',
  },
};

function getAutocomplete(input: string): { suffix: string; completion: string } | null {
  const trimmed = input.trimStart();
  const parts = trimmed.split(/\s+/);
  const cmdPart = parts[0]?.toLowerCase() ?? '';
  const hasSpace = trimmed.includes(' ');

  if (!hasSpace) {
    const val = cmdPart;
    if (!val) return null;
    const matches = ALL_COMMANDS.filter((cmd) => cmd.startsWith(val));
    if (matches.length === 0) return null;
    if (matches.length === 1) {
      return { suffix: matches[0].slice(val.length), completion: matches[0] };
    }
    let prefix = matches[0];
    for (const match of matches.slice(1)) {
      let i = val.length;
      while (i < prefix.length && i < match.length && prefix[i] === match[i]) i++;
      prefix = prefix.slice(0, i);
    }
    if (prefix.length > val.length) {
      return { suffix: prefix.slice(val.length), completion: prefix };
    }
    return null;
  }

  if (cmdPart === 'project' && parts.length === 2) {
    const partial = parts[1].toLowerCase();
    const matches = RESUME.projects
      .map((p) => p.id)
      .filter((id) => id.startsWith(partial));
    if (matches.length === 1) {
      const rest = matches[0].slice(partial.length);
      return { suffix: rest, completion: `project ${matches[0]}` };
    }
  }

  if (cmdPart === 'cat' && parts.length === 2) {
    const partial = parts[1].toLowerCase();
    if ('resume.md'.startsWith(partial) && partial.length < 'resume.md'.length) {
      const rest = 'resume.md'.slice(partial.length);
      return { suffix: rest, completion: `cat resume.md` };
    }
  }

  return null;
}

export function CliTerminal({ asciiArt }: CliTerminalProps) {
  const router = useRouter();
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showBoot, setShowBoot] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const autocomplete = getAutocomplete(input);

  useEffect(() => {
    inputRef.current?.focus();
    setIsFocused(true);
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines, input]);

  const appendOutput = (newLines: TerminalLine[]) => {
    setLines((prev) => [...prev, ...newLines]);
  };

  const runCommandOutput = (result: string | string[]) => {
    if (typeof result === 'string') {
      if (result) appendOutput([{ type: 'success', content: result }]);
    } else {
      appendOutput(result.map((line) => ({ type: 'info' as const, content: line })));
    }
  };

  const executeCommand = (cmd: string) => {
    const trimmed = cmd.trim();

    setLines((prev) => [
      ...prev,
      { type: 'prompt-line1', content: PROMPT_LINE1 },
      { type: 'input', content: `${PROMPT_LINE2} ${cmd}` },
    ]);

    if (!trimmed) return;

    setHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);

    const parts = trimmed.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (command === '/help' || command === 'help') {
      runCommandOutput(COMMANDS.help.execute([]));
    } else if (command === 'clear') {
      setLines([]);
      setShowBoot(false);
    } else if (command === 'exit') {
      appendOutput([{ type: 'info', content: 'Closing terminal...' }]);
    } else if (command === 'openuiportfolio') {
      appendOutput([
        { type: 'success', content: 'Launching animated portfolio UI...' },
        { type: 'info', content: '▸ Redirecting to /portfolio' },
      ]);
      setTimeout(() => router.push('/portfolio'), 700);
    } else if (COMMANDS[command]) {
      runCommandOutput(COMMANDS[command].execute(args));
    } else {
      appendOutput([
        {
          type: 'error',
          content: `command not found: ${command}. Type 'help' for available commands.`,
        },
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeCommand(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (autocomplete) {
        const isFullCommand =
          ALL_COMMANDS.includes(autocomplete.completion) ||
          autocomplete.completion.includes(' ');
        setInput(isFullCommand ? `${autocomplete.completion} ` : autocomplete.completion);
      }
    }
  };

  let cursorChar = ' ';
  let remainingSuffix = '';
  if (autocomplete?.suffix) {
    cursorChar = autocomplete.suffix[0];
    remainingSuffix = autocomplete.suffix.slice(1);
  }

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden bg-[#1a1b2e] font-terminal text-[#c0caf5]"
      onClick={() => {
        inputRef.current?.focus();
      }}
    >
      <div
        ref={terminalRef}
        className="flex-1 overflow-x-auto px-4 py-4 text-sm leading-relaxed"
        style={{
          overflowY: 'scroll',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
          ::-webkit-scrollbar {
            display: none;
          }
        `,
          }}
        />

        {showBoot && (
          <div className="mb-6">
            <div className="mt-4 space-y-1">
              {DEVELOPER_INFO.map((line) => (
                <p key={line} className="text-terminal-green">
                  {line}
                </p>
              ))}
            </div>
            <div
              className="overflow-x-auto pb-2"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <pre
                className="ascii-art-block w-[138ch] max-w-none whitespace-pre text-[#c0caf5]"
                aria-hidden
              >
                {asciiArt}
              </pre>
            </div>
            <p className="mt-4 text-terminal-muted">— type help or resume to get started —</p>
          </div>
        )}

        {lines.map((line, idx) => (
          <div
            key={idx}
            className={`whitespace-pre-wrap break-words ${
              line.type === 'prompt-line1'
                ? 'text-[#9ece6a]'
                : line.type === 'input'
                  ? 'text-[#7aa2f7]'
                  : line.type === 'error'
                    ? 'text-terminal-error'
                    : line.type === 'success'
                      ? 'text-terminal-green'
                      : 'text-[#c0caf5]'
            }`}
          >
            {line.content}
          </div>
        ))}

        <div className="mt-1">
          <div className="whitespace-pre-wrap text-[#9ece6a]">{PROMPT_LINE1}</div>
          <div className="flex items-start">
            <span className="shrink-0 text-[#7aa2f7]">{PROMPT_LINE2}&nbsp;</span>
            <div className="relative flex-1" style={{ minHeight: '1.5em' }}>
              <div className="absolute top-0 left-0 flex items-center whitespace-pre pointer-events-none w-full h-full">
                <span className="text-[#c0caf5]">{input}</span>
                <span
                  className={`inline-flex items-center justify-center ${isFocused ? 'terminal-cursor' : 'bg-transparent text-terminal-autocomplete'} z-10`}
                  style={{ minWidth: '0.6em', height: '1.2em', verticalAlign: 'baseline' }}
                >
                  <span>{cursorChar}</span>
                </span>
                {remainingSuffix ? (
                  <span className="text-terminal-autocomplete">{remainingSuffix}</span>
                ) : null}
              </div>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className="absolute left-0 top-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent outline-none z-20"
                spellCheck={false}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                aria-label="Terminal command input"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
