import { EXAMPLES, FAQ, KOBY_FAQ, PROFILE_LINKS, PROJECT_FAQ, type Example, type Passage, type Source } from './knowledge';

export type Answer = {
  headline: string;
  body: string;
  sources: Source[];
  followups: string[];
  /** Set when the answer is a passage found by search, not a reply written for that question. */
  matched?: boolean;
  /** Other passages that matched nearly as well, shown under the main one. */
  related?: { headline: string; body: string }[];
  /** How Koby holds himself after saying it: waving back at a greeting, shrugging when he has no answer. */
  mood?: 'greeting' | 'unknown';
};

/** The hand-written answers about Ayush: the only questions offered as follow-ups. */
export const ABOUT_AYUSH: Example[] = [...EXAMPLES, ...FAQ, ...PROJECT_FAQ];

/** Every question with a hand-written answer. */
export const ANSWERS: Example[] = [...ABOUT_AYUSH, ...KOBY_FAQ];

/**
 * Reduces a question to a comparable form, so "What's Ayush's stack?" and "what is his stack"
 * are the same question.
 */
export function normalize(question: string): string {
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

/** Deliberately strict: only the question itself and the rewordings listed in `alt` match. */
export function findExample(question: string): Example | undefined {
  return BY_QUESTION.get(normalize(question));
}

/** Rewordings of one question share a canonical form, so a follow-up is never one already asked. */
const canonical = (q: string) => findExample(q)?.q ?? normalize(q);
const fresh = (asked: string[]) => {
  const seen = new Set(asked.map(canonical));
  return (q: string) => !seen.has(canonical(q));
};

/** A pre-written example as an Answer. */
export function exampleAnswer(example: Example, asked: string[] = []): Answer {
  const followups = [...(example.next ?? []), ...EXAMPLES.map((e) => e.q)]
    .filter((q, i, all) => all.indexOf(q) === i)
    .filter(fresh([...asked, example.q]))
    .slice(0, 3);
  return { headline: example.a, body: example.more, sources: example.sources, followups, mood: example.q === 'Hello' ? 'greeting' : undefined };
}

/** Passages found by search, shown word for word: the best one first, the rest as "related". */
export function passageAnswer(passages: Passage[], question: string, asked: string[] = []): Answer {
  const [best, ...rest] = passages;
  const sources = [...best.sources, ...rest.map((p) => p.sources[0])]
    .filter((s, i, all) => all.findIndex((o) => (o.href ?? o.label) === (s.href ?? s.label)) === i)
    .slice(0, 4);
  return {
    headline: best.title,
    body: best.text,
    sources,
    followups: suggestFollowups(`${question} ${passages.map((p) => `${p.title} ${p.text}`).join(' ')}`, asked),
    matched: true,
    related: rest.map((p) => ({ headline: p.title, body: p.text })),
  };
}

/**
 * A model-written reply as it stands so far: its first sentence is the headline, the rest the detail.
 * The model is asked for a one-sentence first paragraph; this holds even when it runs on.
 */
export function splitReply(text: string): { headline: string; body: string } {
  const [first, ...rest] = text.trim().split(/\n\s*\n/);
  // A sentence ends at ., ! or ? followed by a space, so "Node.js" and an email address don't end one.
  const end = first.search(/[.!?](?=\s)/);
  const headline = end === -1 ? first : first.slice(0, end + 1);
  return { headline: headline.trim(), body: [first.slice(headline.length), ...rest].map((p) => p.trim()).filter(Boolean).join('\n\n') };
}

/** A finished model-written reply. Its sources are the facts the model cited, looked up on the server. */
export function replyAnswer(text: string, sources: Source[], question: string, asked: string[] = []): Answer {
  return { ...splitReply(text), sources, followups: suggestFollowups(`${question} ${text}`, asked) };
}

/** The reply when nothing on file matches: say so, rather than guess. */
export function unknownAnswer(question: string, asked: string[] = []): Answer {
  return {
    headline: 'That one’s not in my files.',
    body: `I only know what’s in Ayush’s résumé and portfolio, and I’d rather say so than guess. He can tell you himself: ${PROFILE_LINKS.email}.`,
    sources: [{ kind: 'email', label: PROFILE_LINKS.email, href: `mailto:${PROFILE_LINKS.email}` }],
    followups: suggestFollowups(question, asked),
    mood: 'unknown',
  };
}

const COMMON = new Set(['about', 'what', 'does', 'have', 'with', 'that', 'this', 'from', 'tell', 'show', 'also', 'into', 'there', 'where', 'which', 'when', 'ayush', 'built', 'build']);
const words = (s: string) => new Set(normalize(s).split(' ').filter((w) => w.length > 3 && !COMMON.has(w)));

/**
 * Follow-ups for a searched reply, drawn only from the pre-written questions:
 * the ones that share the most words with the exchange.
 */
export function suggestFollowups(exchange: string, asked: string[]): string[] {
  const topic = words(exchange);
  const isFresh = fresh(asked);
  return ABOUT_AYUSH.filter((e) => isFresh(e.q))
    .map((e, order) => ({ q: e.q, order, score: [...words(`${e.q} ${e.a}`)].filter((w) => topic.has(w)).length }))
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, 3)
    .map((e) => e.q);
}
