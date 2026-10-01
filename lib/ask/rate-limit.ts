/**
 * A best-effort, per-instance rate limit, so a public endpoint that spends API credit can't be hammered.
 * Returns a check that counts the request and says whether its sender is over the limit.
 */
export function rateLimiter(maxRequests: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return (req: Request): boolean => {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    const now = Date.now();
    const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
    recent.push(now);
    hits.set(ip, recent);
    return recent.length > maxRequests;
  };
}
