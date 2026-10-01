import { ANSWERS, exampleAnswer, findExample, normalize, passageAnswer, unknownAnswer, type Answer } from './answers';
import { PASSAGES, type Example, type Passage } from './knowledge';

/**
 * Keyword search over the hand-written answers and the résumé passages: no model, no request.
 * A question is matched on the words it shares with each entry, with rare words (a project name,
 * a skill) counting for more than common ones. The browser uses it to answer when the model can't
 * be reached; the server uses it to pick which facts to give the model.
 */

/** Words that say nothing about what a question is about. */
const STOP = new Set(
  ('a an the is are was were be been being am do does did doing done has have had having he his him it its i me my we our you your ' +
    'of in on at to for with and or but if so as by from into about than then that this these those there here ' +
    'what which who whom whose where when why how can could would should will shall may might must not no yes ' +
    'any some all more most much many very really actually exactly specifically mainly mostly just also too still yet ever tell show give get got let ' +
    'know use used using like want need say go please thanks thank up out off over before time end good great best kind sort thing something anything lot'
  ).split(' '),
);

/** Different words for the same thing, folded into one before matching. */
const CANON: Record<string, string> = {
  k8s: 'kubernetes', postgres: 'postgresql', psql: 'postgresql', mongo: 'mongodb',
  nextjs: 'next', reactjs: 'react', nodejs: 'node', expressjs: 'express',
  currently: 'now', current: 'now', present: 'now', today: 'now', nowadays: 'now', recently: 'now', recent: 'now', lately: 'now', latest: 'now',
  built: 'build', made: 'build', make: 'build', create: 'build', created: 'build', ship: 'build', shipped: 'build', develop: 'build', developed: 'build',
  job: 'work', role: 'work', position: 'work', career: 'work', employer: 'work', employment: 'work', experience: 'work', internship: 'intern',
  college: 'education', university: 'education', school: 'education', degree: 'education', study: 'education', studi: 'education', student: 'education', graduate: 'education', graduation: 'education', bachelor: 'education',
  cert: 'credential', certification: 'credential', certificate: 'credential', cohort: 'credential', course: 'credential',
  reach: 'contact', email: 'contact', mail: 'contact',
  hiring: 'hire', recruit: 'hire',
  located: 'location', locat: 'location', live: 'location', based: 'location', country: 'location', city: 'location',
  front: 'frontend', back: 'backend', crypto: 'web3', defi: 'web3',
  authentication: 'auth', login: 'auth', perp: 'perpetual', cv: 'resume',
  technology: 'tech', technologie: 'tech', availability: 'available',
};

function stem(w: string): string {
  if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith('ed')) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  return w;
}

function terms(text: string): string[] {
  return normalize(text)
    // "This website" is the portfolio itself, which is a different thing from a website Ayush built for a client.
    .replace(/\bthis (website|site|app|page|portfolio|desktop|place)\b/g, 'thissite')
    .split(' ')
    .filter((w) => (w.length > 1 || w === 'c') && !STOP.has(w))
    .map((w) => {
      const s = CANON[w] ?? stem(w);
      return CANON[s] ?? s;
    })
    .filter((w) => !STOP.has(w));
}

/** `primary` is how an entry is asked for (its question, or a passage's title); `body` is the rest of its text. */
type Entry = { primary: Set<string>; body: Set<string>; example?: Example; passage?: Passage };

const ENTRIES: Entry[] = [
  ...ANSWERS.map((example) => ({
    primary: new Set(terms([example.q, ...(example.alt ?? [])].join(' '))),
    body: new Set(terms(`${example.a} ${example.more}`)),
    example,
  })),
  ...PASSAGES.map((passage) => ({
    primary: new Set(terms([passage.title, ...(passage.aliases ?? [])].join(' '))),
    body: new Set(terms(passage.text)),
    passage,
  })),
];

const COUNT = new Map<string, number>();
for (const e of ENTRIES) for (const t of new Set([...e.primary, ...e.body])) COUNT.set(t, (COUNT.get(t) ?? 0) + 1);

/** A word found in few entries says more about the question than one found in many. */
const MAX_WEIGHT = 2.6;
const weight = (term: string) => {
  const n = COUNT.get(term) ?? 0;
  return Math.min(MAX_WEIGHT, Math.log(1 + (ENTRIES.length - n + 0.5) / (n + 0.5)));
};

const BODY_WEIGHT = 0.5;
/** How much of the question an entry must account for (1 = every word, in its primary text), so a stray shared word is not an answer. */
const EXAMPLE_COVERAGE = 0.6;
const PASSAGE_COVERAGE = 0.4;
/** Further passages are shown only if they match nearly as well as the best one. */
const RELATED_RATIO = 0.75;

export type Found = { kind: 'example'; example: Example } | { kind: 'passages'; passages: Passage[] } | { kind: 'none' };

/** Every entry scored against the question, best first. Empty when the question has no usable words. */
function scoreAll(question: string) {
  const asked = [...new Set(terms(question))];
  const total = asked.reduce((sum, t) => sum + weight(t), 0);
  if (!total) return [];

  return ENTRIES.map((entry) => {
    let score = 0;
    let inPrimary = 0;
    for (const t of asked) {
      if (entry.primary.has(t)) {
        score += weight(t);
        inPrimary += 1;
      } else if (entry.body.has(t)) {
        score += weight(t) * BODY_WEIGHT;
      }
    }
    // On equal scores, the entry that is about less else wins ("his work" is the work answer, not Trench's).
    return { entry, score, coverage: score / total, inPrimary, focus: inPrimary / (entry.primary.size || 1) };
  }).sort((a, b) => b.score - a.score || b.focus - a.focus);
}

/** Every answer and passage that shares a word with the question, most relevant first. */
export function rank(question: string): (Example | Passage)[] {
  return scoreAll(question).filter((s) => s.score > 0).map((s) => s.entry.example ?? s.entry.passage!);
}

export function search(question: string): Found {
  const exact = findExample(question);
  if (exact) return { kind: 'example', example: exact };

  const scored = scoreAll(question);

  // A hand-written answer is only reused when the question itself resembles one it was written for.
  const example = scored.find((s) => s.entry.example && s.inPrimary > 0 && s.coverage >= EXAMPLE_COVERAGE);
  const passages = scored.filter((s) => s.entry.passage && s.coverage >= PASSAGE_COVERAGE);

  if (example && (!passages.length || example.score >= passages[0].score)) return { kind: 'example', example: example.entry.example! };
  if (!passages.length) return { kind: 'none' };
  return {
    kind: 'passages',
    passages: passages.filter((s) => s.score >= passages[0].score * RELATED_RATIO).slice(0, 3).map((s) => s.entry.passage!),
  };
}

/** The answer to a visitor's question. `asked` is every question in the chat so far, this one included. */
export function answer(question: string, asked: string[]): Answer {
  const found = search(question);
  if (found.kind === 'example') return exampleAnswer(found.example, asked);
  if (found.kind === 'passages') return passageAnswer(found.passages, question, asked);
  return unknownAnswer(question, asked);
}
