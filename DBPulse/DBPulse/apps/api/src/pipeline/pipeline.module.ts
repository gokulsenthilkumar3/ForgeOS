import { Module } from '@nestjs/common';
import { PipelineService } from './pipeline.service';
import { EventsModule } from '../events/events.module';
import { AlertsModule } from '../alerts/alerts.module';
import { StreamModule } from '../stream/stream.module';

@Module({
  imports: [EventsModule, AlertsModule, StreamModule],
  providers: [PipelineService],
  exports: [PipelineService],
})
export class PipelineModule {}
