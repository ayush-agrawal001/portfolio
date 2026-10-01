import { PROFILE_LINKS } from '@/lib/ask/knowledge';
import { factsFor, sourcesFor, systemPrompt } from '@/lib/ask/prompt';
import { rateLimiter } from '@/lib/ask/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_TURNS = 8;
const MAX_CHARS = 600;
const MAX_TOKENS = 400;
/** Per provider, so a slow one leaves time for the next. */
const TIMEOUT_MS = 20_000;

/** A chat-completions API that speaks the OpenAI wire format, streaming included. */
type Provider = { name: string; url: string; key: string; model: string; headers?: Record<string, string>; extra?: Record<string, unknown> };

/** The models to ask, in order: the next is tried only when the one before can't answer. One without a key is skipped. */
function providers(): Provider[] {
  const all: (Omit<Provider, 'key'> & { key?: string })[] = [
    {
      name: 'OpenRouter',
      url: 'https://openrouter.ai/api/v1/chat/completions',
      key: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-5.5',
      headers: { 'HTTP-Referer': PROFILE_LINKS.website, 'X-Title': 'Ask Ayush' },
    },
    {
      name: 'Google',
      url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      key: process.env.GOOGLE_API_KEY,
      model: process.env.GOOGLE_MODEL || 'gemini-3.8-flash',
      // Gemini's hidden reasoning counts towards max_tokens and was cutting replies off after a few words.
      extra: { reasoning_effort: 'none' },
    },
  ];
  return all.filter((p): p is Provider => !!p.key);
}

const isRateLimited = rateLimiter(30, 10 * 60 * 1000);

type Message = { role: 'user' | 'assistant'; content: string };

function parseMessages(body: unknown): Message[] | null {
  if (!body || typeof body !== 'object' || !Array.isArray((body as { messages?: unknown }).messages)) return null;
  const raw = (body as { messages: unknown[] }).messages.slice(-MAX_TURNS);
  const out: Message[] = [];
  for (const m of raw) {
    if (!m || typeof m !== 'object') return null;
    const { role, content } = m as { role?: unknown; content?: unknown };
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') return null;
    const text = content.trim().slice(0, role === 'user' ? MAX_CHARS : 1500);
    if (!text) return null;
    out.push({ role, content: text });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  if (!out.length || out[out.length - 1].role !== 'user') return null;
  return out;
}

type StreamEvent = { t: 'delta'; v: string } | { t: 'sources'; v: ReturnType<typeof sourcesFor> } | { t: 'done' } | { t: 'error'; v: string };

/** The model ends its reply with a "SOURCES: F3, F12" line, which is turned into links here and never shown. */
const SOURCES_LINE = /(?:^|\n)[ \t]*sources:([\s\S]*)$/i;
const MARKER = '\nsources:';

export async function POST(req: Request) {
  const chain = providers();
  if (!chain.length) return Response.json({ error: 'Ask Ayush has no model configured (missing OPENROUTER_API_KEY or GOOGLE_API_KEY).' }, { status: 503 });

  if (isRateLimited(req)) {
    return Response.json({ error: 'Too many questions in a row. Take a breath and try again in a few minutes.' }, { status: 429 });
  }

  let messages: Message[] | null = null;
  // Set in voice mode: the reply will be read out, so it should be written for the ear.
  let spoken = false;
  try {
    const json: unknown = await req.json();
    messages = parseMessages(json);
    spoken = (json as { spoken?: unknown } | null)?.spoken === true;
  } catch {
    messages = null;
  }
  if (!messages) return Response.json({ error: 'Invalid request.' }, { status: 400 });

  // A follow-up ("and before that?") only makes sense next to the question before it.
  const topic = messages.filter((m) => m.role === 'user').slice(-2).map((m) => m.content).join(' ');
  const payload = { stream: true, max_tokens: MAX_TOKENS, temperature: 0.2, messages: [{ role: 'system', content: systemPrompt(factsFor(topic), spoken) }, ...messages] };

  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: StreamEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + '\n'));
      let full = '';
      let sent = 0;
      // Passes on the reply as it grows, stopping short of the sources line (or what may be the start of it).
      const flush = (final: boolean) => {
        const at = full.toLowerCase().indexOf(MARKER);
        let end = at === -1 ? full.length : at;
        if (at === -1 && !final) {
          for (let n = Math.min(MARKER.length - 1, full.length); n > 0; n--) {
            if (MARKER.startsWith(full.slice(-n).toLowerCase())) {
              end = full.length - n;
              break;
            }
          }
        }
        if (end > sent) {
          send({ t: 'delta', v: full.slice(sent, end) });
          sent = end;
        }
      };

      /** Streams one provider's reply to the visitor. Throws if it can't be had. */
      const relay = async (provider: Provider) => {
        const signal = AbortSignal.any([req.signal, AbortSignal.timeout(TIMEOUT_MS)]);
        const request = () =>
          fetch(provider.url, {
            method: 'POST',
            headers: { Authorization: `Bearer ${provider.key}`, 'Content-Type': 'application/json', ...provider.headers },
            body: JSON.stringify({ model: provider.model, ...payload, ...provider.extra }),
            signal,
          });
        let upstream = await request();
        // "Overloaded, try again shortly" is usually true: give it one more go before moving on.
        if (upstream.status === 503) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          upstream = await request();
        }
        if (!upstream.ok || !upstream.body) throw new Error(`${upstream.status}: ${(await upstream.text().catch(() => '')).slice(0, 300)}`);

        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            // Server-sent events: only "data:" lines carry text; the rest are keep-alive comments.
            if (!line.startsWith('data:')) continue;
            const data = line.slice(5).trim();
            if (!data || data === '[DONE]') continue;
            const chunk = JSON.parse(data) as { error?: { message?: string }; choices?: { delta?: { content?: string | null } }[] };
            if (chunk.error) throw new Error(chunk.error.message ?? 'Upstream error');
            const piece = chunk.choices?.[0]?.delta?.content;
            if (piece) {
              full += piece;
              flush(false);
            }
          }
        }
        flush(true);
        if (!full.replace(SOURCES_LINE, '').trim()) throw new Error('Empty reply');
      };

      let answered = false;
      for (const provider of chain) {
        try {
          await relay(provider);
          answered = true;
          break;
        } catch (error) {
          console.error(`${provider.name} (${provider.model}) failed:`, error instanceof Error ? error.message : error);
          // Part of a reply is already on the visitor's screen, or they have left: don't start a second one.
          if (sent > 0 || req.signal.aborted) break;
          full = '';
        }
      }

      if (answered) {
        send({ t: 'sources', v: sourcesFor(full.match(SOURCES_LINE)?.[1].match(/F\d+/gi) ?? []) });
        send({ t: 'done' });
      } else {
        send({ t: 'error', v: 'Something went wrong. Try again in a moment.' });
      }
      controller.close();
    },
  });

  return new Response(body, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
