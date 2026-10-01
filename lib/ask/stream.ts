import type { Source } from './knowledge';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

/**
 * Asks the model through /api/ask and reports the reply as it is written.
 * Throws if no reply can be had (no key, rate limit, outage), so the caller can fall back to search.
 */
export async function streamReply(messages: ChatMessage[], onText: (text: string) => void): Promise<{ text: string; sources: Source[] }> {
  const res = await fetch('/api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok || !res.body) throw new Error(`Ask failed (${res.status})`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';
  let sources: Source[] = [];
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) continue;
      const e = JSON.parse(line) as { t: 'delta'; v: string } | { t: 'sources'; v: Source[] } | { t: 'done' } | { t: 'error'; v: string };
      if (e.t === 'delta') {
        text += e.v;
        onText(text);
      } else if (e.t === 'sources') {
        sources = e.v;
      } else if (e.t === 'error') {
        throw new Error(e.v);
      }
    }
  }
  if (!text.trim()) throw new Error('Empty reply');
  return { text: text.trim(), sources };
}
