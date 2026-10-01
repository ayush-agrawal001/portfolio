'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { exampleAnswer, findExample, replyAnswer, splitReply, type Answer } from '@/lib/ask/answers';
import { ASSISTANT, EXAMPLES, FAQ, type Source } from '@/lib/ask/knowledge';
import { answer as searchAnswer } from '@/lib/ask/search';
import { streamReply, type ChatMessage } from '@/lib/ask/stream';
import { ArrowRightIcon, AskBadge, MicIcon } from './icons';
import { KobyPet, type KobyPose } from './koby-pet';
import { DISPLAY, MONO, OS } from './theme';
import { useVoice, type VoicePhase } from './use-voice';

/** `text` is a model reply while it is still being written; `answer` is the finished thing. */
type AssistantTurn = { role: 'assistant'; status: 'thinking' | 'done'; text?: string; answer?: Answer };
type Turn = { role: 'user'; text: string } | AssistantTurn;

export type AskRequest = { question: string; id: number } | null;

/** How much of the chat (questions and answers) is sent along with a new question. */
const HISTORY_TURNS = 6;

/** Category chip for each example question, in the same order as EXAMPLES. */
const TAGS: { tag: string; color: string }[] = [
  { tag: 'work', color: OS.cyan },
  { tag: 'skills', color: OS.orange },
  { tag: 'right now', color: OS.green },
  { tag: 'projects', color: OS.pink },
  { tag: 'skills', color: OS.orange },
  { tag: 'fun', color: OS.yellow },
  { tag: 'stack', color: OS.purple },
  { tag: 'hire', color: OS.green },
];

/** The hanko seal is Koby's face; it gently "breathes" while an answer is being written. */
function Orb({ size = 72, busy = false }: { size?: number; busy?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className="inline-flex shrink-0"
      style={{ rotate: -4 }}
      animate={busy && !reduce ? { opacity: [1, 0.55, 1] } : { opacity: 1 }}
      transition={busy ? { repeat: Infinity, duration: 1.1, ease: 'easeInOut' } : { duration: 0.2 }}
    >
      <AskBadge size={size} round={false} />
    </motion.span>
  );
}

export function AskApp({ request }: { request: AskRequest }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(false);
  const [hint, setHint] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const turnsRef = useRef<Turn[]>([]);
  turnsRef.current = turns;

  const updateLast = (fn: (t: AssistantTurn) => AssistantTurn) =>
    setTurns((prev) => {
      const last = prev[prev.length - 1];
      if (!last || last.role !== 'assistant') return prev;
      return [...prev.slice(0, -1), fn(last)];
    });

  // In voice mode a spoken question is asked like a typed one, and its answer is read out.
  const askRef = useRef<(question: string) => void>(() => {});
  const voice = useVoice((heard) => askRef.current(heard));
  const { hold, say, isOn } = voice;

  const ask = useCallback(async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setDraft('');
    hold();
    const history = turnsRef.current;
    // Follow-ups skip anything already asked in this chat.
    const asked = [...history.filter((t) => t.role === 'user').map((t) => t.text), q];
    setTurns([...history, { role: 'user', text: q }, { role: 'assistant', status: 'thinking' }]);
    setBusy(true);

    const finish = (answer: Answer) => {
      updateLast((t) => ({ ...t, status: 'done', answer }));
      setBusy(false);
      void say(`${answer.headline}\n${answer.body}`);
    };

    // Pre-written questions are answered from the page itself: no request, no tokens.
    const example = findExample(q);
    if (example) {
      // A short "thinking" beat so pre-written answers feel as alive as streamed ones.
      setTimeout(() => finish(exampleAnswer(example, asked)), 650);
      return;
    }

    try {
      const messages: ChatMessage[] = [
        ...history.slice(-HISTORY_TURNS).flatMap((t): ChatMessage[] => {
          if (t.role === 'user') return [{ role: 'user', content: t.text }];
          return t.answer ? [{ role: 'assistant', content: `${t.answer.headline}\n\n${t.answer.body}`.trim() }] : [];
        }),
        { role: 'user', content: q },
      ];
      // In a voice conversation the reply is written to be said, not read.
      const { text, sources } = await streamReply(messages, (partial) => updateLast((t) => ({ ...t, text: partial })), isOn());
      finish(replyAnswer(text, sources, q, asked));
    } catch {
      // No key, a rate limit or an outage: answer with what a search of the résumé finds instead.
      finish(searchAnswer(q, asked));
    }
  }, [busy, hold, say, isOn]);
  askRef.current = (question) => void ask(question);

  useEffect(() => {
    if (request) void ask(request.question);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.id]);

  useEffect(() => {
    // Only follow the conversation: the start screen should open at its top.
    if (turns.length) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [turns]);

  useEffect(() => {
    if (window.matchMedia('(min-width: 768px)').matches) inputRef.current?.focus();
    const id = setInterval(() => setHint((n) => (n + 1) % EXAMPLES.length), 3200);
    return () => clearInterval(id);
  }, []);

  const empty = turns.length === 0;
  const last = turns[turns.length - 1];
  const thinking = last?.role === 'assistant' && last.status === 'thinking';
  const followups = last?.role === 'assistant' && last.status === 'done' ? last.answer?.followups ?? [] : [];
  const talking = voice.phase !== 'off';
  // The mic button starts a conversation, cuts Koby off while it is speaking, and otherwise ends the conversation.
  const mic = { off: voice.start, speaking: voice.interrupt, listening: voice.stop, thinking: voice.stop }[voice.phase];
  const voiceStatus = {
    off: '',
    listening: 'listening · tap the mic to end',
    thinking: 'thinking…',
    speaking: 'speaking · tap the mic to interrupt',
  }[voice.phase];

  return (
    <div className="flex h-full min-h-0 flex-col" style={{ color: OS.text }}>
      {!empty && (
        <div className="flex h-12 shrink-0 items-center justify-between border-b px-4 sm:px-6" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          <span className="flex items-center gap-2.5 text-sm font-medium">
            <Orb size={22} busy={thinking || voice.phase === 'speaking'} />
            {ASSISTANT.name}
            <span className="text-xs font-normal" style={{ color: OS.muted, fontFamily: MONO }}>· {ASSISTANT.role.toLowerCase()}</span>
          </span>
          <button
            type="button"
            onClick={() => { voice.stop(); setTurns([]); }}
            disabled={busy}
            className="rounded-lg px-3 py-1.5 text-xs transition-colors hover:bg-white/5 disabled:opacity-40"
            style={{ color: OS.dim, border: `1px solid ${OS.tileHi}` }}
          >
            New chat
          </button>
        </div>
      )}

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-8">
        <div className={`mx-auto flex w-full max-w-[720px] flex-col gap-6 py-8 ${empty ? 'min-h-full justify-center' : ''}`}>
          {empty ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="flex flex-col gap-8">
              <div className="flex items-start gap-4">
                <KobyPet pose={voice.phase === 'listening' ? 'listen' : 'wave'} size={116} />
                <div className="flex flex-col gap-3">
                  <h1 className="text-[28px] leading-tight tracking-tight sm:text-[34px]" style={{ fontFamily: DISPLAY, fontWeight: 700 }}>
                    Ask me about Ayush.
                  </h1>
                  <p className="max-w-[520px] text-[15px] leading-relaxed" style={{ color: OS.dim }}>
                    Hi, I’m {ASSISTANT.name}, {ASSISTANT.role}. I keep his résumé and portfolio on file, so I can answer for him
                    while he’s busy breaking something in production. If I don’t know, I’ll say so.
                  </p>
                  <span className="text-[13px] italic" style={{ color: OS.muted }}>— {ASSISTANT.name}</span>
                </div>
              </div>

              <nav aria-label="Suggested questions" className="flex flex-col">
                <span className="pb-2 text-[11px]" style={{ color: OS.muted, fontFamily: MONO }}>people usually ask</span>
                {EXAMPLES.map((e, i) => (
                  <button
                    key={e.q}
                    type="button"
                    onClick={() => void ask(e.q)}
                    className="group flex items-baseline gap-4 border-t py-3 text-left transition-colors"
                    style={{ borderColor: OS.card }}
                  >
                    <span className="w-6 shrink-0 text-xs tabular-nums" style={{ color: OS.muted, fontFamily: MONO }}>{String(i + 1).padStart(2, '0')}</span>
                    <span className="flex-1 text-[15px] transition-colors group-hover:text-[#E6C384]">{e.q}</span>
                    <span className="text-[11px]" style={{ color: TAGS[i].color, fontFamily: MONO }}>{TAGS[i].tag}</span>
                  </button>
                ))}
              </nav>

              <nav aria-label="More questions" className="flex flex-col gap-2.5">
                <span className="text-[11px]" style={{ color: OS.muted, fontFamily: MONO }}>also answered instantly</span>
                <div className="flex flex-wrap gap-2">
                  {FAQ.map((e) => (
                    <button
                      key={e.q}
                      type="button"
                      onClick={() => void ask(e.q)}
                      className="rounded-full border px-3 py-1.5 text-[13px] transition-colors hover:border-[#7E9CD8] hover:text-white"
                      style={{ borderColor: OS.tileHi, color: OS.dim, background: 'rgba(42,42,55,0.55)' }}
                    >
                      {e.q}
                    </button>
                  ))}
                </div>
              </nav>
            </motion.div>
          ) : (
            <AnimatePresence initial={false}>
              {turns.map((t, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className={t.role === 'user' ? 'self-end max-w-[85%]' : ''}>
                  {t.role === 'user' ? (
                    <div className="rounded-2xl rounded-br-md px-4 py-2.5 text-[15px] leading-relaxed" style={{ background: OS.card, border: `1px solid ${OS.tile}` }}>
                      {t.text}
                    </div>
                  ) : (
                    <AssistantMessage turn={t} isLast={i === turns.length - 1} voicePhase={voice.phase} />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {!empty && followups.length > 0 && !busy && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="flex flex-col gap-2 pl-[78px]">
              <span className="text-[10px] uppercase tracking-[0.14em]" style={{ color: OS.muted, fontFamily: MONO }}>Recommended</span>
              <div className="flex flex-wrap gap-2">
                {followups.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void ask(q)}
                    className="rounded-full border px-3.5 py-2 text-[13px] transition-colors hover:border-[#7E9CD8] hover:text-white"
                    style={{ borderColor: OS.tileHi, color: OS.dim, background: 'rgba(42,42,55,0.55)' }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <div className="shrink-0 px-4 pb-4 pt-2 sm:px-8">
        <div className="mx-auto w-full max-w-[720px] rounded-xl border transition-colors" style={{ borderColor: focused ? OS.dim : OS.tile }}>
          <form
            onSubmit={(e) => { e.preventDefault(); void ask(draft); }}
            className="flex h-14 items-center gap-2 rounded-[11px] pl-4 pr-2"
            style={{ background: '#1A1A22' }}
          >
            <span style={{ color: OS.purple, fontFamily: MONO }} aria-hidden>›</span>
            <label htmlFor="ask-input" className="sr-only">Ask a question about Ayush</label>
            <input
              ref={inputRef}
              id="ask-input"
              // While listening, the box shows what has been heard so far.
              value={voice.interim || draft}
              readOnly={!!voice.interim}
              onChange={(e) => setDraft(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={voice.phase === 'listening' ? 'Listening…' : empty ? EXAMPLES[hint].q : 'Ask a follow-up…'}
              maxLength={600}
              autoComplete="off"
              className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#727169]"
            />
            <kbd className="hidden rounded border px-1.5 py-0.5 text-[10px] sm:block" style={{ borderColor: OS.tileHi, color: OS.muted, fontFamily: MONO }}>enter</kbd>
            {voice.supported && (
              <button
                type="button"
                onClick={mic}
                aria-label={talking ? 'End voice conversation' : 'Talk to Koby'}
                aria-pressed={talking}
                title={talking ? 'End voice conversation' : 'Talk to Koby'}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors ${voice.phase === 'listening' ? 'animate-pulse' : ''}`}
                style={talking ? { background: voice.phase === 'speaking' ? OS.purple : OS.red, borderColor: 'transparent', color: OS.panelDeep } : { borderColor: OS.tileHi, color: OS.dim }}
              >
                <MicIcon size={18} />
              </button>
            )}
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              aria-label="Send"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-opacity disabled:opacity-35"
              style={{ background: OS.text, color: OS.panelDeep }}
            >
              <ArrowRightIcon size={18} />
            </button>
          </form>
        </div>
        <p className="mx-auto mt-2 max-w-[720px] text-center text-[11px]" style={{ color: OS.muted }} aria-live="polite">
          {talking ? (
            <span style={{ fontFamily: MONO }}>voice · {voiceStatus}</span>
          ) : voice.error ? (
            <span style={{ color: OS.red }}>{voice.error}</span>
          ) : (
            <>
              {ASSISTANT.name} answers from Ayush’s résumé and portfolio. Questions go to an AI model to write the reply; this site doesn’t store them.
              {voice.supported && ' In voice mode your browser’s speech service listens, and Google’s reads the answers out.'}
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function SourceChip({ source, n }: { source: Source; n: number }) {
  const inner = (
    <>
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold" style={{ background: OS.tile, color: OS.yellow }}>{n}</span>
      <span className="truncate"><span style={{ color: OS.muted }}>{source.kind} · </span>{source.label}</span>
    </>
  );
  const cls = 'flex max-w-full items-center gap-2 rounded-full border px-2.5 py-1 text-xs transition-colors';
  const style = { borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(42,42,55,0.55)' };
  return source.href ? (
    <a href={source.href} target={source.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className={`${cls} hover:border-[#7E9CD8]`} style={style}>{inner}</a>
  ) : (
    <span className={cls} style={style}>{inner}</span>
  );
}

/** What the Koby character beside the latest answer is doing. */
function kobyPose(turn: AssistantTurn, voicePhase: VoicePhase): KobyPose {
  if (turn.status === 'thinking') return turn.text ? 'talk' : 'think';
  if (voicePhase === 'speaking') return 'talk';
  if (voicePhase === 'listening') return 'listen';
  if (turn.answer?.mood === 'greeting') return 'wave';
  if (turn.answer?.mood === 'unknown') return 'shrug';
  return 'proud';
}

function AssistantMessage({ turn, isLast, voicePhase }: { turn: AssistantTurn; isLast: boolean; voicePhase: VoicePhase }) {
  const writing = turn.status === 'thinking' && !!turn.text;
  const answer: Answer | undefined = turn.answer ?? (turn.text ? { ...splitReply(turn.text), sources: [], followups: [] } : undefined);
  return (
    <div className="flex gap-3" aria-live={isLast ? 'polite' : undefined}>
      {/* The latest answer is Koby himself talking; earlier ones keep his seal. */}
      {isLast ? <KobyPet pose={kobyPose(turn, voicePhase)} size={92} /> : <Orb size={32} />}
      <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
        {!answer && <span className="os-shimmer text-sm" style={{ fontFamily: MONO }}>{ASSISTANT.name.toLowerCase()} is checking resume.md…</span>}
        {/* A searched passage is quoted as it stands, so say so: it may not answer the exact question. */}
        {answer?.matched && <span className="text-[11px]" style={{ color: OS.muted, fontFamily: MONO }}>closest match on file</span>}
        {answer?.headline && <p className="text-[19px] leading-snug tracking-tight" style={{ fontFamily: DISPLAY, fontWeight: 600 }}>{answer.headline}</p>}
        {answer?.body && <p className="whitespace-pre-line break-words text-[15px] leading-relaxed" style={{ color: '#DCD7BA' }}>{answer.body}</p>}
        {answer?.related?.map((r) => (
          <div key={r.headline} className="flex flex-col gap-1 pt-2">
            <p className="text-[15px] font-semibold leading-snug">{r.headline}</p>
            <p className="whitespace-pre-line break-words text-[15px] leading-relaxed" style={{ color: '#DCD7BA' }}>{r.body}</p>
          </div>
        ))}
        {writing && <span className="inline-block h-4 w-2 animate-pulse rounded-sm" style={{ background: OS.purple }} />}
        {answer && answer.sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {answer.sources.map((s, i) => <SourceChip key={i} source={s} n={i + 1} />)}
          </div>
        )}
      </div>
    </div>
  );
}
