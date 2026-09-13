import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { DedupService } from './dedup.service';

@Module({
  providers: [EventsService, DedupService],
  controllers: [EventsController],
  exports: [EventsService, DedupService],
})
export class EventsModule {}
