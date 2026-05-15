'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface TerminalLine {
  type: 'input' | 'output' | 'error' | 'success' | 'info';
  content: string;
}

const COMMANDS: Record<string, { description: string; execute: (args: string[]) => string | string[] }> = {
  help: {
    description: 'Display available commands',
    execute: () => {
      const lines = [
        '╔════════════════════════════════════════════════════════════╗',
        '║                   AVAILABLE COMMANDS                       ║',
        '╚════════════════════════════════════════════════════════════╝',
        '',
        '  help              - Display this help message',
        '  about             - Learn about this terminal',
        '  date              - Show current date and time',
        '  whoami            - Display current user',
        '  echo <text>       - Echo text to terminal',
        '  calc <math>       - Calculate mathematical expressions',
        '  ls                - List directory contents',
        '  pwd               - Print working directory',
        '  weather <city>    - Show weather info (demo)',
        '  color             - Display color palette',
        '  clear             - Clear the terminal',
        '  openuiportfolio   - Open animated portfolio UI',
        '  exit              - Exit the terminal',
        '',
        'Type a command followed by Enter to execute.',
        'Use arrow up/down to navigate command history.',
      ];
      return lines;
    },
  },
  about: {
    description: 'Show information about this terminal',
    execute: () => {
      const lines = [
        '',
        '╭─ Terminal CLI v1.0.0 ─────────────────────────────────────╮',
        '│ A browser-based terminal emulator with authentic CLI feel │',
        '│ Built with Next.js, React, and Tailwind CSS              │',
        '│                                                           │',
        '│ Features:                                                 │',
        '│  • Full command execution environment                     │',
        '│  • Command history navigation                             │',
        '│  • Real-time output rendering                             │',
        '│  • Extended command set                                   │',
        '│                                                           │',
        '│ Created for the modern web developer                      │',
        '╰───────────────────────────────────────────────────────────╯',
      ];
      return lines;
    },
  },
  date: {
    description: 'Show current date and time',
    execute: () => new Date().toString(),
  },
  whoami: {
    description: 'Display current user',
    execute: () => 'guest@terminal-cli:~$ whoami\nguest',
  },
  echo: {
    description: 'Echo text to terminal',
    execute: (args) => {
      const text = args.join(' ');
      return text || '';
    },
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
    execute: () => {
      return [
        'drwxr-xr-x  4 guest guest 4096 Mar 15 10:32 .',
        'drwxr-xr-x 12 guest guest 4096 Mar 15 10:32 ..',
        '-rw-r--r--  1 guest guest  220 Mar 15 10:32 .bashrc',
        '-rw-r--r--  1 guest guest  180 Mar 15 10:32 .profile',
        'drwxr-xr-x  2 guest guest 4096 Mar 15 10:32 Documents',
        'drwxr-xr-x  2 guest guest 4096 Mar 15 10:32 Downloads',
        'drwxr-xr-x  2 guest guest 4096 Mar 15 10:32 Pictures',
        '-rw-r--r--  1 guest guest 1234 Mar 15 10:32 README.md',
      ];
    },
  },
  pwd: {
    description: 'Print working directory',
    execute: () => '/home/guest',
  },
  weather: {
    description: 'Show weather information',
    execute: (args) => {
      const city = args.join(' ') || 'San Francisco';
      return [
        `Weather in ${city}:`,
        '  Temperature: 72°F (22°C)',
        '  Condition: Mostly Clear',
        '  Humidity: 65%',
        '  Wind Speed: 12 mph',
      ];
    },
  },
  color: {
    description: 'Display color palette',
    execute: () => {
      return [
        '',
        '   Color Palette:',
        '   ■ Green (Primary):    #00FF00',
        '   ■ Cyan (Secondary):   #00D4FF',
        '   ■ Orange (Warning):   #FFAA00',
        '   ■ Red (Danger):       #FF3333',
        '   ■ Lime (Success):     #00FF88',
        '   ■ Background:         #0A0E27',
      ];
    },
  },
  clear: {
    description: 'Clear the terminal',
    execute: () => ({ _clear: true }),
  },
  exit: {
    description: 'Exit the terminal',
    execute: () => 'Goodbye!',
  },
};

const PORTFOLIO_COMMANDS = ['openuiportfolio'];

export function CliTerminal() {
  const router = useRouter();
  const [lines, setLines] = useState<TerminalLine[]>([
    {
      type: 'info',
      content: 'Welcome to Terminal CLI - Type help or openuiportfolio to begin',
    },
    { type: 'info', content: '' },
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  const executeCommand = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    // Add to history
    setHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);

    // Parse command
    const parts = trimmed.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Add input line
    setLines((prev) => [
      ...prev,
      { type: 'input', content: `$ ${trimmed}` },
    ]);

    // Execute command
    if (command === '/help' || command === 'help') {
      const helpOutput = COMMANDS.help.execute();
      const helpLines = Array.isArray(helpOutput) ? helpOutput : [helpOutput];
      setLines((prev) => [
        ...prev,
        ...helpLines.map((line) => ({ type: 'info' as const, content: line })),
      ]);
    } else if (command === 'clear') {
      setLines([]);
    } else if (command === 'exit') {
      setLines((prev) => [
        ...prev,
        { type: 'info', content: 'Closing terminal...' },
      ]);
    } else if (command === 'openuiportfolio') {
      setLines((prev) => [
        ...prev,
        { type: 'success', content: 'Launching animated portfolio UI...' },
        { type: 'info', content: '▸ Redirecting to /portfolio' },
      ]);
      setTimeout(() => router.push('/portfolio'), 700);
    } else if (COMMANDS[command]) {
      const cmdObj = COMMANDS[command];
      const result = cmdObj.execute(args);

      if (typeof result === 'string') {
        setLines((prev) => [
          ...prev,
          { type: 'success', content: result },
        ]);
      } else {
        const resultLines = result;
        setLines((prev) => [
          ...prev,
          ...resultLines.map((line) => ({
            type: 'info' as const,
            content: line,
          })),
        ]);
      }
    } else {
      setLines((prev) => [
        ...prev,
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
      // Tab completion - suggest commands
      const input_val = input.toLowerCase();
      const matches = [...Object.keys(COMMANDS), ...PORTFOLIO_COMMANDS].filter(
        (cmd) => cmd.startsWith(input_val)
      );
      if (matches.length === 1) {
        setInput(matches[0] + ' ');
      }
    }
  };

  return (
    <div className="w-full h-screen bg-background text-foreground flex flex-col font-terminal overflow-hidden">
      {/* Header */}
      <div className="bg-muted/30 border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-text-success animate-pulse"></div>
          <span className="text-foreground font-bold">TERMINAL</span>
        </div>
        <span className="text-xs text-muted-foreground">guest@terminal-cli:~</span>
      </div>

      {/* Terminal Output */}
      <div
        ref={terminalRef}
        className="flex-1 overflow-y-auto px-4 py-3 space-y-0 scrollbar-thin scrollbar-thumb-border scrollbar-track-background"
      >
        {lines.map((line, idx) => (
          <div
            key={idx}
            className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${
              line.type === 'input'
                ? 'text-foreground font-bold'
                : line.type === 'error'
                  ? 'text-text-error'
                  : line.type === 'success'
                    ? 'text-text-success'
                    : 'text-secondary/80'
            }`}
          >
            {line.content}
          </div>
        ))}
      </div>

      {/* Input Line */}
      <div className="bg-muted/20 border-t border-border px-4 py-3 flex items-center gap-2">
        <span className="text-foreground font-bold flex-shrink-0">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-foreground outline-none font-terminal text-sm"
          spellCheck="false"
          autoComplete="off"
          placeholder="Type a command..."
        />
        <span className="terminal-cursor text-foreground">|</span>
      </div>
    </div>
  );
}
