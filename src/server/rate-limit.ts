// A sliding-window request budget per client address, held in memory for one window and never
// logged. It is per server instance, so it blunts bursts rather than enforcing a global quota.

type RateLimitVerdict = { allowed: true } | { allowed: false; retryAfterSeconds: number };

type RateLimiterOptions = {
  limit: number;
  windowMs: number;
  maxTrackedClients?: number;
  now?: () => number;
};

export function createRateLimiter({
  limit,
  windowMs,
  maxTrackedClients = 10_000,
  now = Date.now,
}: RateLimiterOptions) {
  const hits = new Map<string, number[]>();

  const prune = (windowStart: number) => {
    const stale = [...hits].filter(([, times]) => (times.at(-1) ?? 0) <= windowStart);
    for (const [key] of stale) hits.delete(key);
    if (hits.size > maxTrackedClients) hits.clear();
  };

  return {
    take(key: string): RateLimitVerdict {
      const time = now();
      const windowStart = time - windowMs;
      const recent = (hits.get(key) ?? []).filter((stamp) => stamp > windowStart);

      if (recent.length >= limit) {
        hits.set(key, recent);
        const oldest = recent[0] ?? time;
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - time) / 1000)),
        };
      }

      hits.set(key, [...recent, time]);
      if (hits.size > maxTrackedClients) prune(windowStart);
      return { allowed: true };
    },
  };
}

// Vercel overwrites x-forwarded-for with the connecting address, so the first entry is trusted
// there. Anywhere else it is only as trustworthy as the proxy in front.
export function clientAddress(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
