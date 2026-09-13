import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Pool } from 'pg';
import { ConnectorsService } from './connectors.service';
import {
  installAuditTriggers,
  removeAuditTriggers,
  listAuditTriggers,
} from '@dbpulse/connector-postgres/setup';

@Injectable()
export class TriggersService {
  constructor(private readonly connectors: ConnectorsService) {}

  private getPool(connectionId: string): Pool {
    const connector = this.connectors.getActiveConnector(connectionId) as any;
    if (!connector?.pool) {
      throw new NotFoundException(
        `Connection ${connectionId} is not active. Connect it first via POST /api/connections/${connectionId}/connect`,
      );
    }
    return connector.pool as Pool;
  }

  async installTriggers(
    connectionId: string,
    options: { schemas?: string[]; dryRun?: boolean; includeTruncate?: boolean },
  ) {
    const pool = this.getPool(connectionId);
    const results = await installAuditTriggers(pool, {} as any, options);
    const installed = results.filter((r) => r.installed && !r.error).length;
    const skipped = results.filter((r) => r.skipped).length;
    const failed = results.filter((r) => !!r.error).length;
    return {
      summary: { installed, skipped, failed, dryRun: options.dryRun ?? false },
      details: results,
    };
  }

  async removeTriggers(connectionId: string, schemas: string[]) {
    const pool = this.getPool(connectionId);
    const results = await removeAuditTriggers(pool, schemas);
    const dropped = results.reduce((sum, r) => sum + r.dropped.length, 0);
    return { summary: { dropped }, details: results };
  }

  async listTriggers(connectionId: string, schemas: string[]) {
    const pool = this.getPool(connectionId);
    return listAuditTriggers(pool, schemas);
  }
}
