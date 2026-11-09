type AttemptWindow = { count: number; resetAt: number };

export class AuthenticationThrottle {
  private readonly attempts = new Map<string, AttemptWindow>();

  constructor(
    private readonly limit = 10,
    private readonly windowMs = 15 * 60_000,
    private readonly maxKeys = 4096,
  ) {}

  check(key: string, now = Date.now()): number | undefined {
    const window = this.attempts.get(key);
    if (!window) return undefined;
    if (window.resetAt <= now) {
      this.attempts.delete(key);
      return undefined;
    }
    if (window.count < this.limit) return undefined;
    return Math.max(1, Math.ceil((window.resetAt - now) / 1000));
  }

  record(key: string, now = Date.now()): number | undefined {
    const retryAfter = this.check(key, now);
    if (retryAfter !== undefined) return retryAfter;
    const current = this.attempts.get(key);
    if (current && current.resetAt > now) {
      this.attempts.delete(key);
      this.attempts.set(key, { ...current, count: current.count + 1 });
    } else {
      this.attempts.set(key, { count: 1, resetAt: now + this.windowMs });
    }
    while (this.attempts.size > this.maxKeys) {
      const oldest = this.attempts.keys().next().value;
      if (oldest === undefined) break;
      this.attempts.delete(oldest);
    }
    return undefined;
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}
