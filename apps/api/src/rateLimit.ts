export type RateLimiterOptions = {
  windowMs: number;
  maxAttempts: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

export class RateLimitError extends Error {
  statusCode = 429;
}

export function createRateLimiter(options: RateLimiterOptions) {
  const buckets = new Map<string, Bucket>();

  function check(key: string) {
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return;
    }
    if (bucket.count >= options.maxAttempts) {
      throw new RateLimitError("rate limit exceeded");
    }
    bucket.count += 1;
  }

  function reset(key: string) {
    buckets.delete(key);
  }

  return { check, reset };
}
