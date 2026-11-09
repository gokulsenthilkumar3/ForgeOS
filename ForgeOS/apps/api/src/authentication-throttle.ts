type AttemptWindow = {
  failures: { sequence: number }[];
  nextFailureSequence: number;
  reservations: Map<symbol, number>;
  resetAt: number;
};

export class AuthenticationThrottle {
  private readonly attempts = new Map<string, AttemptWindow>();

  constructor(
    private readonly limit = 10,
    private readonly windowMs = 15 * 60_000,
    private readonly maxKeys = 4096,
  ) {}

  check(key: string, now = Date.now()): number | undefined {
    const window = this.getWindow(key, now);
    if (!window) return undefined;
    if (window.failures.length + window.reservations.size < this.limit) return undefined;
    return Math.max(1, Math.ceil((window.resetAt - now) / 1000));
  }

  record(key: string, now = Date.now()): number | undefined {
    const retryAfter = this.check(key, now);
    if (retryAfter !== undefined) return retryAfter;
    const window = this.getOrCreateWindow(key, now);
    window.failures.push({ sequence: ++window.nextFailureSequence });
    this.touch(key, window);
    return undefined;
  }

  reserve(key: string, now = Date.now()): symbol | undefined {
    if (this.check(key, now) !== undefined) return undefined;
    const window = this.getOrCreateWindow(key, now);
    const reservation = Symbol(key);
    window.reservations.set(reservation, window.nextFailureSequence);
    this.touch(key, window);
    return reservation;
  }

  complete(key: string, reservation: symbol, succeeded: boolean, now = Date.now()): void {
    const window = this.getWindow(key, now);
    if (!window) return;
    const failureSequenceAtReservation = window.reservations.get(reservation);
    if (failureSequenceAtReservation === undefined) return;
    window.reservations.delete(reservation);
    if (succeeded) {
      window.failures = window.failures.filter(failure => failure.sequence > failureSequenceAtReservation);
    } else {
      window.failures.push({ sequence: ++window.nextFailureSequence });
    }
    if (!window.failures.length && !window.reservations.size) this.attempts.delete(key);
    else this.touch(key, window);
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }

  private getWindow(key: string, now: number): AttemptWindow | undefined {
    const window = this.attempts.get(key);
    if (!window || window.resetAt > now) return window;
    if (!window.reservations.size) {
      this.attempts.delete(key);
      return undefined;
    }
    window.failures = [];
    window.resetAt = now + this.windowMs;
    this.touch(key, window);
    return window;
  }

  private getOrCreateWindow(key: string, now: number): AttemptWindow {
    const current = this.getWindow(key, now);
    if (current) return current;
    const window: AttemptWindow = {
      failures: [],
      nextFailureSequence: 0,
      reservations: new Map(),
      resetAt: now + this.windowMs,
    };
    this.attempts.set(key, window);
    return window;
  }

  private touch(key: string, window: AttemptWindow): void {
    this.attempts.delete(key);
    this.attempts.set(key, window);
    while (this.attempts.size > this.maxKeys) {
      const oldest = this.attempts.keys().next().value;
      if (oldest === undefined) break;
      this.attempts.delete(oldest);
    }
  }
}
