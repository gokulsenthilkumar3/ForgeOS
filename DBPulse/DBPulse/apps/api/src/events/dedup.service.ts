import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

const DEDUP_TTL_SECONDS = 300;  // 5-minute dedup window
const DEDUP_PREFIX = 'dbpulse:dedup:';

/**
 * Deduplication service using Redis SET NX with TTL.
 * Prevents the same event_hash from being persisted more than once
 * within a 5-minute window — guards against connector double-fire
 * and Redis Stream redelivery edge cases.
 */
@Injectable()
export class DedupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DedupService.name);
  private redis: Redis;

  constructor(private config: ConfigService) {
    this.redis = new Redis(this.config.getOrThrow('REDIS_URL'), { lazyConnect: true });
  }

  async onModuleInit() { await this.redis.connect(); }
  async onModuleDestroy() { await this.redis.quit(); }

  /**
   * Returns true if this hash is NEW (not seen before).
   * Returns false if it's a duplicate — caller should discard.
   */
  async isNew(eventHash: string): Promise<boolean> {
    if (!eventHash) return true;  // no hash = always allow through
    const key = `${DEDUP_PREFIX}${eventHash}`;
    // SET key 1 NX EX ttl — only sets if key doesn't exist
    const result = await this.redis.set(key, '1', 'EX', DEDUP_TTL_SECONDS, 'NX');
    if (result === null) {
      this.logger.debug(`Duplicate event suppressed: ${eventHash}`);
      return false;
    }
    return true;
  }

  /** Manually expire a hash (e.g. after a failed save, allow retry) */
  async release(eventHash: string): Promise<void> {
    await this.redis.del(`${DEDUP_PREFIX}${eventHash}`);
  }
}
