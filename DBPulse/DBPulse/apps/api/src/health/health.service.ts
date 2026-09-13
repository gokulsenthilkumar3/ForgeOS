import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Redis from 'ioredis';
import { ConnectorsService } from '../connectors/connectors.service';

export type HealthStatus = 'healthy' | 'degraded' | 'down';

export interface ConnectionHealth {
  connectionId: string;
  name: string;
  engine: string;
  status: HealthStatus;
  lastPingMs: number | null;
  lastCheckedAt: string;
  error?: string;
}

export interface SystemHealth {
  api: HealthStatus;
  redis: HealthStatus;
  supabase: HealthStatus;
  connections: ConnectionHealth[];
  checkedAt: string;
}

@Injectable()
export class HealthService implements OnModuleInit {
  private readonly logger = new Logger(HealthService.name);
  private readonly supabase: SupabaseClient;
  private readonly redis: Redis;
  private connectionHealthCache = new Map<string, ConnectionHealth>();
  private interval: NodeJS.Timeout | null = null;

  constructor(
    private config: ConfigService,
    private connectors: ConnectorsService,
  ) {
    this.supabase = createClient(
      this.config.getOrThrow('SUPABASE_URL'),
      this.config.getOrThrow('SUPABASE_SERVICE_ROLE_KEY'),
    );
    this.redis = new Redis(this.config.getOrThrow('REDIS_URL'), { lazyConnect: true });
  }

  async onModuleInit() {
    await this.redis.connect();
    // Poll connection health every 30s
    this.interval = setInterval(() => this.checkAllConnections(), 30_000);
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const [redisStatus, supabaseStatus] = await Promise.all([
      this.checkRedis(),
      this.checkSupabase(),
    ]);

    return {
      api: 'healthy',
      redis: redisStatus,
      supabase: supabaseStatus,
      connections: [...this.connectionHealthCache.values()],
      checkedAt: new Date().toISOString(),
    };
  }

  async checkConnection(connectionId: string): Promise<ConnectionHealth> {
    const connector = this.connectors.getActiveConnector(connectionId) as any;
    const connections = await this.connectors.listConnections();
    const conn = connections.find((c: any) => c.id === connectionId);

    if (!connector) {
      const health: ConnectionHealth = {
        connectionId,
        name: conn?.name ?? connectionId,
        engine: conn?.engine ?? 'unknown',
        status: 'down',
        lastPingMs: null,
        lastCheckedAt: new Date().toISOString(),
        error: 'Connector not active',
      };
      this.connectionHealthCache.set(connectionId, health);
      return health;
    }

    const start = Date.now();
    try {
      const alive = await connector.ping();
      const lastPingMs = Date.now() - start;
      const health: ConnectionHealth = {
        connectionId,
        name: conn?.name ?? connectionId,
        engine: conn?.engine ?? 'unknown',
        status: alive ? 'healthy' : 'degraded',
        lastPingMs,
        lastCheckedAt: new Date().toISOString(),
      };
      this.connectionHealthCache.set(connectionId, health);
      return health;
    } catch (err: any) {
      const health: ConnectionHealth = {
        connectionId,
        name: conn?.name ?? connectionId,
        engine: conn?.engine ?? 'unknown',
        status: 'down',
        lastPingMs: Date.now() - start,
        lastCheckedAt: new Date().toISOString(),
        error: err?.message ?? String(err),
      };
      this.connectionHealthCache.set(connectionId, health);
      return health;
    }
  }

  private async checkAllConnections(): Promise<void> {
    const connections = await this.connectors.listConnections();
    await Promise.allSettled(
      connections.map((c: any) => this.checkConnection(c.id)),
    );
  }

  private async checkRedis(): Promise<HealthStatus> {
    try {
      const pong = await this.redis.ping();
      return pong === 'PONG' ? 'healthy' : 'degraded';
    } catch {
      return 'down';
    }
  }

  private async checkSupabase(): Promise<HealthStatus> {
    try {
      const { error } = await this.supabase.from('db_connections').select('id').limit(1);
      return error ? 'degraded' : 'healthy';
    } catch {
      return 'down';
    }
  }
}
