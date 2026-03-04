import { describe, expect, it, vi } from "vitest";

import { createRateLimiter, RateLimitError } from "../src/rateLimit";

describe("rate limiter", () => {
  it("blocks after max attempts within window", () => {
    const limiter = createRateLimiter({ windowMs: 1000, maxAttempts: 2 });

    limiter.check("key");
    limiter.check("key");

    expect(() => limiter.check("key")).toThrow(RateLimitError);
  });

  it("resets after window passes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const limiter = createRateLimiter({ windowMs: 5, maxAttempts: 1 });

    limiter.check("key");

    vi.advanceTimersByTime(6);
    expect(() => limiter.check("key")).not.toThrow();

    vi.useRealTimers();
  });
});
