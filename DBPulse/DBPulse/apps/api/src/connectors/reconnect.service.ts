import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConnectorsService } from './connectors.service';
import { PipelineService } from '../pipeline/pipeline.service';

interface ReconnectState {
  connectionId: string;
  attempts: number;
  nextRetryAt: number;
  timer: NodeJS.Timeout | null;
  aborted: boolean;
}

const MAX_ATTEMPTS = 10;
const BASE_DELAY_MS = 1_000;   // 1s
const MAX_DELAY_MS = 60_000;   // 60s cap

function backoffMs(attempt: number): number {
  // Exponential backoff with full jitter: random(0, min(cap, base * 2^attempt))
  const exp = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * Math.pow(2, attempt));
  return Math.floor(Math.random() * exp);
}

@Injectable()
export class ReconnectService implements OnModuleDestroy {
  private readonly logger = new Logger(ReconnectService.name);
  private readonly states = new Map<string, ReconnectState>();

  constructor(
    private connectors: ConnectorsService,
    private pipeline: PipelineService,
  ) {}

  onModuleDestroy() {
    for (const state of this.states.values()) {
      state.aborted = true;
      if (state.timer) clearTimeout(state.timer);
    }
    this.states.clear();
  }

  /** Start supervised reconnect loop for a connection */
  scheduleReconnect(connectionId: string): void {
    if (this.states.has(connectionId)) return; // already scheduled

    const state: ReconnectState = {
      connectionId,
      attempts: 0,
      nextRetryAt: Date.now(),
      timer: null,
      aborted: false,
    };
    this.states.set(connectionId, state);
    this.attempt(state);
  }

  /** Cancel reconnect for a connection (e.g. user explicitly disconnected) */
  cancel(connectionId: string): void {
    const state = this.states.get(connectionId);
    if (!state) return;
    state.aborted = true;
    if (state.timer) clearTimeout(state.timer);
    this.states.delete(connectionId);
    this.logger.log(`Reconnect cancelled for ${connectionId}`);
  }

  /** Returns current reconnect state for observability */
  getState(connectionId: string) {
    const s = this.states.get(connectionId);
    if (!s) return null;
    return {
      connectionId: s.connectionId,
      attempts: s.attempts,
      nextRetryAt: new Date(s.nextRetryAt).toISOString(),
      aborted: s.aborted,
    };
  }

  getAllStates() {
    return [...this.states.values()].map((s) => this.getState(s.connectionId));
  }

  private attempt(state: ReconnectState): void {
    if (state.aborted) return;

    if (state.attempts >= MAX_ATTEMPTS) {
      this.logger.error(
        `Giving up reconnect for ${state.connectionId} after ${MAX_ATTEMPTS} attempts`,
      );
      this.states.delete(state.connectionId);
      return;
    }

    const delay = backoffMs(state.attempts);
    state.nextRetryAt = Date.now() + delay;
    state.attempts += 1;

    this.logger.warn(
      `Scheduling reconnect for ${state.connectionId} — attempt ${state.attempts}/${MAX_ATTEMPTS} in ${delay}ms`,
    );

    state.timer = setTimeout(async () => {
      if (state.aborted) return;
      try {
        await this.connectors.connect(state.connectionId, async (event) => {
          await this.pipeline.publish(event);
        });
        this.logger.log(`Reconnected successfully: ${state.connectionId}`);
        this.states.delete(state.connectionId);
      } catch (err) {
        this.logger.error(`Reconnect attempt ${state.attempts} failed for ${state.connectionId}: ${err}`);
        this.attempt(state); // schedule next attempt
      }
    }, delay);
  }
}
