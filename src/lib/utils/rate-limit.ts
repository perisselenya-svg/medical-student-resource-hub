import "server-only";
import { env } from "@/lib/env";

/**
 * Fixed-window in-memory rate limiter keyed by arbitrary strings.
 *
 * Scope: one Node.js process. This matches the single-container deployment in
 * docker-compose.yml. Nginx applies a second, independent limit (limit_req) on
 * /api/auth/ in front of the app, so limits still hold across restarts. If you
 * scale to multiple app replicas, move this store to Redis/PostgreSQL.
 */
type Bucket = { count: number; resetAt: number };

export class RateLimiter {
  private buckets = new Map<string, Bucket>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  /** Returns seconds until unblocked, or 0 if the key may proceed. */
  retryAfter(key: string, now = Date.now()): number {
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) return 0;
    return bucket.count >= this.max ? Math.ceil((bucket.resetAt - now) / 1000) : 0;
  }

  /** Record one hit (e.g. a failed login). */
  hit(key: string, now = Date.now()): void {
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
    } else {
      bucket.count += 1;
    }
    this.sweep(now);
  }

  reset(key: string): void {
    this.buckets.delete(key);
  }

  // Bound memory: drop expired buckets once the map grows large.
  private sweep(now: number) {
    if (this.buckets.size < 10_000) return;
    for (const [key, bucket] of this.buckets) if (bucket.resetAt <= now) this.buckets.delete(key);
  }
}

/* ---------------------- Application limiter instances ---------------------- */
// Created lazily so configuration is read at runtime, not at build time.


let instances: {
  loginPerAccount: RateLimiter;
  loginPerIp: RateLimiter;
  uploads: RateLimiter;
  counters: RateLimiter;
  quizSubmit: RateLimiter;
} | null = null;

export function limiters() {
  if (!instances) {
    const e = env();
    const loginWindow = e.LOGIN_RATE_LIMIT_WINDOW_MINUTES * 60_000;
    instances = {
      // Failed logins per (email + IP): slows targeted guessing of one account.
      loginPerAccount: new RateLimiter(e.LOGIN_RATE_LIMIT_MAX, loginWindow),
      // Failed logins per IP (4x looser): slows password spraying across accounts.
      loginPerIp: new RateLimiter(e.LOGIN_RATE_LIMIT_MAX * 4, loginWindow),
      // Uploads/re-uploads per admin: bounds disk and CPU abuse from a stolen session.
      uploads: new RateLimiter(e.UPLOAD_RATE_LIMIT_MAX, e.UPLOAD_RATE_LIMIT_WINDOW_MINUTES * 60_000),
      // One counted view/download per (IP + material) per 30 minutes: stops count inflation.
      counters: new RateLimiter(1, 30 * 60_000),
      // Quiz answer submissions per IP: generous for real use, blocks scripted scraping of answers.
      quizSubmit: new RateLimiter(300, 10 * 60_000),
    };
  }
  return instances;
}
