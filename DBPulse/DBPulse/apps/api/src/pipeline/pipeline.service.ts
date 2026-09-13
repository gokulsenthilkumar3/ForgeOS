import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AuditEvent } from '@dbpulse/shared';
import { EventsService } from '../events/events.service';
import { DedupService } from '../events/dedup.service';
import { AlertsService } from '../alerts/alerts.service';
import { StreamGateway } from '../stream/stream.gateway';

const PIPELINE_QUEUE = 'dbpulse:events:queue';
const CONSUMER_GROUP = 'dbpulse:consumers';
const CONSUMER_NAME = `consumer:${process.pid}`;

@Injectable()
export class PipelineService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PipelineService.name);
  private publisher: Redis;
  private subscriber: Redis;
  private running = false;
  private pollTimer: NodeJS.Timeout | null = null;

  constructor(
    private config: ConfigService,
    private eventsService: EventsService,
    private dedupService: DedupService,
    private alertsService: AlertsService,
    private streamGateway: StreamGateway,
  ) {
    const redisUrl = this.config.getOrThrow('REDIS_URL');
    this.publisher = new Redis(redisUrl, { lazyConnect: true });
    this.subscriber = new Redis(redisUrl, { lazyConnect: true });
  }

  async onModuleInit() {
    await this.publisher.connect();
    await this.subscriber.connect();
    await this.ensureStreamGroup();
    this.running = true;
    this.startConsumer();
    this.logger.log('Pipeline service started');
  }

  async onModuleDestroy() {
    this.running = false;
    if (this.pollTimer) clearTimeout(this.pollTimer);
    await this.publisher.quit();
    await this.subscriber.quit();
  }

  async publish(event: AuditEvent): Promise<void> {
    await this.publisher.xadd(PIPELINE_QUEUE, '*', 'payload', JSON.stringify(event));
  }

  private async ensureStreamGroup(): Promise<void> {
    try {
      await this.publisher.xgroup('CREATE', PIPELINE_QUEUE, CONSUMER_GROUP, '$', 'MKSTREAM');
    } catch (err: any) {
      if (!err?.message?.includes('BUSYGROUP')) throw err;
    }
  }

  private startConsumer() {
    const poll = async () => {
      if (!this.running) return;
      try {
        const results = await this.subscriber.xreadgroup(
          'GROUP', CONSUMER_GROUP, CONSUMER_NAME,
          'COUNT', '10', 'BLOCK', '1000',
          'STREAMS', PIPELINE_QUEUE, '>',
        ) as [string, [string, string[]][]][] | null;

        if (results) {
          for (const [, messages] of results) {
            for (const [msgId, fields] of messages) {
              const payloadIdx = fields.indexOf('payload');
              if (payloadIdx === -1) continue;
              const event: AuditEvent = JSON.parse(fields[payloadIdx + 1]);
              await this.process(msgId, event);
            }
          }
        }
      } catch (err) {
        this.logger.error('Pipeline consumer error', err);
      }
      if (this.running) this.pollTimer = setTimeout(poll, 0);
    };
    poll();
  }

  private async process(msgId: string, event: AuditEvent): Promise<void> {
    // 1. Deduplication check
    if (event.eventHash) {
      const isNew = await this.dedupService.isNew(event.eventHash);
      if (!isNew) {
        await this.subscriber.xack(PIPELINE_QUEUE, CONSUMER_GROUP, msgId);
        return;
      }
    }

    try {
      // 2. Persist
      const saved = await this.eventsService.saveEvent(event);
      // 3. Alert evaluation
      await this.alertsService.evaluate(saved);
      // 4. Real-time broadcast
      this.streamGateway.broadcast(saved);
      // 5. Ack only after successful processing
      await this.subscriber.xack(PIPELINE_QUEUE, CONSUMER_GROUP, msgId);
    } catch (err) {
      this.logger.error(`Failed to process event ${event.id}: ${err}`);
      // Release dedup lock so the event can be retried on redeliver
      if (event.eventHash) await this.dedupService.release(event.eventHash);
      // Do NOT ack — Redis will redeliver after PEL timeout
    }
  }
}
