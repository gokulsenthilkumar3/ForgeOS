import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { ConnectorsModule } from './connectors/connectors.module';
import { EventsModule } from './events/events.module';
import { StreamModule } from './stream/stream.module';
import { AlertsModule } from './alerts/alerts.module';
import { PipelineModule } from './pipeline/pipeline.module';
import { HealthModule } from './health/health.module';
import { RateLimitModule } from './rate-limit/rate-limit.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    ConnectorsModule,
    EventsModule,
    StreamModule,
    AlertsModule,
    PipelineModule,
    HealthModule,
    RateLimitModule,
  ],
})
export class AppModule {}
