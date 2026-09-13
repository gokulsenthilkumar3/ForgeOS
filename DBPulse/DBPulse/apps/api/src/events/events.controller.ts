import { Controller, Get, Param, Query } from '@nestjs/common';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  query(
    @Query('connectionId') connectionId?: string,
    @Query('tableName') tableName?: string,
    @Query('actor') actor?: string,
    @Query('operation') operation?: string,
    @Query('schemaName') schemaName?: string,
    @Query('search') search?: string,
    @Query('since') since?: string,
    @Query('until') until?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.events.queryEvents({
      connectionId, tableName, actor, operation, schemaName, search,
      since, until,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Get('stats/:connectionId')
  stats(@Param('connectionId') connectionId: string) {
    return this.events.getEventStats(connectionId);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.events.getEventById(id);
  }
}
