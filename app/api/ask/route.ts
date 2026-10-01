import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT } from '@/lib/ask/knowledge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MODEL = 'claude-opus-5-5';
const MAX_TURNS = 12;
const MAX_CHARS = 600;

// Best-effort, per-instance rate limit so a public endpoint can't be hammered.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 30;
const hits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_REQUESTS;
}

function parseMessages(body: unknown): Anthropic.Beta.BetaMessageParam[] | null {
  if (!body || typeof body !== 'object' || !Array.isArray((body as { messages?: unknown }).messages)) return null;
  const raw = (body as { messages: unknown[] }).messages.slice(-MAX_TURNS);
  const out: Anthropic.Beta.BetaMessageParam[] = [];
  for (const m of raw) {
    if (!m || typeof m !== 'object') return null;
    const { role, content } = m as { role?: unknown; content?: unknown };
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') return null;
    const text = content.trim().slice(0, role === 'user' ? MAX_CHARS : 4000);
    if (!text) return null;
    out.push({ role, content: text });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  if (!out.length || out[out.length - 1].role !== 'user') return null;
  return out;
}

type StreamEvent =
  | { t: 'delta'; v: string }
  | { t: 'reset' }
  | { t: 'done' }
  | { t: 'refusal' }
  | { t: 'error'; v: string };

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'Ask Ayush is not configured yet (missing ANTHROPIC_API_KEY).' }, { status: 503 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (isRateLimited(ip)) {
    return Response.json({ error: 'Too many questions in a row. Take a breath and try again in a few minutes.' }, { status: 429 });
  }

  let messages: Anthropic.Beta.BetaMessageParam[] | null = null;
  try {
    messages = parseMessages(await req.json());
  } catch {
    messages = null;
  }
  if (!messages) return Response.json({ error: 'Invalid request.' }, { status: 400 });

  const client = new Anthropic();
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: StreamEvent) => controller.enqueue(encoder.encode(JSON.stringify(e) + '\n'));
      try {
        const stream = client.beta.messages.stream({
          model: MODEL,
          max_tokens: 4000,
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          output_config: { effort: 'low' },
          system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
          messages: messages!,
        });

        for await (const event of stream) {
          if (event.type === 'content_block_start' && (event.content_block as { type: string }).type === 'fallback') {
            // A model declined and another took over: drop whatever was shown so far.
            send({ t: 'reset' });
          } else if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            send({ t: 'delta', v: event.delta.text });
          }
        }

        const final = await stream.finalMessage();
        send(final.stop_reason === 'refusal' ? { t: 'refusal' } : { t: 'done' });
      } catch (error) {
        let message = 'Something went wrong. Try again in a moment.';
        if (error instanceof Anthropic.RateLimitError) message = 'Ask Ayush is busy right now. Try again in a minute.';
        else if (error instanceof Anthropic.AuthenticationError) message = 'Ask Ayush is misconfigured (bad API key).';
        else if (error instanceof Anthropic.APIError) console.error(`Claude API error ${error.status}:`, error.message);
        else console.error(error);
        send({ t: 'error', v: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
