import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  ttlSeconds: number;
  key: string;
}

/**
 * Sliding window rate limiter backed by Redis.
 * Used to throttle high-volume tables from flooding the pipeline.
 */
@Injectable()
export class RateLimitService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RateLimitService.name);
  private redis: Redis;

  // Default: max 500 events per table per minute
  private readonly DEFAULT_LIMIT = 500;
  private readonly DEFAULT_WINDOW_SECONDS = 60;

  constructor(private config: ConfigService) {
    this.redis = new Redis(this.config.getOrThrow('REDIS_URL'), { lazyConnect: true });
  }

  async onModuleInit() { await this.redis.connect(); }
  async onModuleDestroy() { await this.redis.quit(); }

  /**
   * Check if an event for a given table should be allowed through.
   * Key: dbpulse:rate:{connectionId}:{tableName}
   */
  async checkTable(
    connectionId: string,
    tableName: string,
    limit = this.DEFAULT_LIMIT,
    windowSeconds = this.DEFAULT_WINDOW_SECONDS,
  ): Promise<RateLimitResult> {
    const key = `dbpulse:rate:${connectionId}:${tableName}`;
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const windowStart = now - windowMs;

    // Atomic sliding window using Redis sorted set
    const pipeline = this.redis.pipeline();
    pipeline.zremrangebyscore(key, '-inf', windowStart);  // evict expired
    pipeline.zadd(key, now, `${now}-${Math.random()}`);   // record this event
    pipeline.zcard(key);                                   // count in window
    pipeline.expire(key, windowSeconds + 1);              // auto-expire key
    const results = await pipeline.exec();

    const count = (results?.[2]?.[1] as number) ?? 0;
    const allowed = count <= limit;

    if (!allowed) {
      this.logger.warn(
        `Rate limit exceeded: ${connectionId}/${tableName} — ${count}/${limit} events in ${windowSeconds}s`,
      );
    }

    return { allowed, count, limit, ttlSeconds: windowSeconds, key };
  }

  /** Get current rate count without incrementing */
  async getRate(
    connectionId: string,
    tableName: string,
    windowSeconds = this.DEFAULT_WINDOW_SECONDS,
  ): Promise<number> {
    const key = `dbpulse:rate:${connectionId}:${tableName}`;
    const windowStart = Date.now() - windowSeconds * 1000;
    await this.redis.zremrangebyscore(key, '-inf', windowStart);
    return this.redis.zcard(key);
  }

  /** Reset rate counter for a table (e.g. after bulk import) */
  async resetRate(connectionId: string, tableName: string): Promise<void> {
    const key = `dbpulse:rate:${connectionId}:${tableName}`;
    await this.redis.del(key);
  }
}
