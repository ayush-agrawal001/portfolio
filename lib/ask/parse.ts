import { EXAMPLES, FAQ, PROJECT_FAQ, type Example, type Source } from './knowledge';

export type Answer = { headline: string; body: string; sources: Source[]; followups: string[] };

/** Every question with a hand-written answer. Asking any of these never reaches the model. */
const ANSWERS: Example[] = [...EXAMPLES, ...FAQ, ...PROJECT_FAQ];

const SEPARATOR = /\n\s*-{3,}\s*(\n|$)/;

/** The visible part of a (possibly still streaming) reply: everything before the `---` line. */
export function visiblePart(raw: string): string {
  const cut = raw.search(SEPARATOR);
  const text = cut === -1 ? raw : raw.slice(0, cut);
  // Hide a separator that is only half streamed in.
  return text.replace(/\n\s*-{1,2}\s*$/, '').trim();
}

function toSource(entry: string): Source | null {
  const s = entry.trim();
  if (!s) return null;
  const url = s.match(/https?:\/\/\S+/)?.[0];
  if (url) {
    try {
      const u = new URL(url);
      const host = u.hostname.replace(/^www\./, '');
      const path = u.pathname.replace(/\/$/, '').split('/').filter(Boolean).pop();
      return { kind: host, label: path || host, href: url };
    } catch {
      return null;
    }
  }
  const [kind, ...rest] = s.split(':');
  return rest.length ? { kind: kind.trim().toLowerCase(), label: rest.join(':').trim() } : { kind: 'résumé', label: s };
}

/** A model reply, parsed. Its follow-ups are filled in by `suggestFollowups`, not by the model. */
export function parseAnswer(raw: string): Answer {
  const visible = visiblePart(raw);
  const [headline, ...restParas] = visible.split(/\n\s*\n/);
  const cut = raw.search(SEPARATOR);
  const meta = cut === -1 ? '' : raw.slice(cut);
  const sourcesLine = meta.match(/^\s*sources:\s*(.+)$/im)?.[1] ?? '';
  return {
    headline: (headline ?? '').trim(),
    body: restParas.join('\n\n').trim(),
    sources: sourcesLine.split('|').map(toSource).filter((x): x is Source => !!x).slice(0, 3),
    followups: [],
  };
}

/**
 * Reduces a question to a comparable form, so "What's Ayush's stack?" and "what is his stack"
 * are the same question. Deliberately strict: only rewordings listed in `alt` match, never a guess.
 */
function normalize(question: string): string {
  return question
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, '')
    .replace(/\bwhats\b/g, 'what is')
    .replace(/\bhes\b/g, 'he is')
    .replace(/\bayushs\b/g, 'his')
    .replace(/\bayush\b/g, 'he')
    .replace(/[^a-z0-9+#]+/g, ' ')
    .replace(/^(and|so|ok|okay|hey|hi) /, '')
    .replace(/ please$/, '')
    .trim();
}

const BY_QUESTION = new Map<string, Example>();
for (const e of ANSWERS) for (const q of [e.q, ...(e.alt ?? [])]) BY_QUESTION.set(normalize(q), e);

export function findExample(question: string): Example | undefined {
  return BY_QUESTION.get(normalize(question));
}

/** Rewordings of one question share a canonical form, so a follow-up is never one already asked. */
const canonical = (q: string) => findExample(q)?.q ?? normalize(q);
const fresh = (asked: string[]) => {
  const seen = new Set(asked.map(canonical));
  return (q: string) => !seen.has(canonical(q));
};

/** A pre-written example as an Answer, plus the text we send back to the model as history. */
export function exampleAnswer(example: Example, asked: string[] = []): { answer: Answer; text: string } {
  const followups = [...(example.next ?? []), ...EXAMPLES.map((e) => e.q)]
    .filter((q, i, all) => all.indexOf(q) === i)
    .filter(fresh([...asked, example.q]))
    .slice(0, 3);
  const answer: Answer = { headline: example.a, body: example.more, sources: example.sources, followups };
  const text = `${example.a}\n\n${example.more}\n---\nsources: ${example.sources.map((s) => s.href ?? `${s.kind}: ${s.label}`).join(' | ')}`;
  return { answer, text };
}

const COMMON = new Set(['about', 'what', 'does', 'have', 'with', 'that', 'this', 'from', 'tell', 'show', 'also', 'into', 'there', 'where', 'which', 'when', 'ayush', 'built', 'build']);
const words = (s: string) => new Set(normalize(s).split(' ').filter((w) => w.length > 3 && !COMMON.has(w)));

/**
 * Follow-ups for a model-written reply, drawn only from the pre-written questions:
 * the ones that share the most words with the exchange, so the next click costs nothing.
 */
export function suggestFollowups(exchange: string, asked: string[]): string[] {
  const topic = words(exchange);
  const isFresh = fresh(asked);
  return ANSWERS.filter((e) => isFresh(e.q))
    .map((e, order) => ({ q: e.q, order, score: [...words(`${e.q} ${e.a}`)].filter((w) => topic.has(w)).length }))
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, 3)
    .map((e) => e.q);
}
