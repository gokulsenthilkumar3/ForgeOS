import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { TriggersService } from './triggers.service';

export class InstallTriggersDto {
  schemas?: string[];
  dryRun?: boolean;
  includeTruncate?: boolean;
}

@Controller('connections/:id/postgres')
export class TriggersController {
  constructor(private readonly triggers: TriggersService) {}

  /** GET /api/connections/:id/postgres/triggers
   *  List all installed dbpulse triggers */
  @Get('triggers')
  list(
    @Param('id') id: string,
    @Query('schemas') schemas?: string,
  ) {
    const schemaList = schemas ? schemas.split(',') : ['public'];
    return this.triggers.listTriggers(id, schemaList);
  }

  /** POST /api/connections/:id/postgres/install-triggers
   *  Auto-install audit triggers across selected schemas */
  @Post('install-triggers')
  install(
    @Param('id') id: string,
    @Body() dto: InstallTriggersDto,
  ) {
    return this.triggers.installTriggers(id, dto);
  }

  /** DELETE /api/connections/:id/postgres/triggers
   *  Remove all dbpulse triggers from selected schemas */
  @Delete('triggers')
  remove(
    @Param('id') id: string,
    @Query('schemas') schemas?: string,
  ) {
    const schemaList = schemas ? schemas.split(',') : ['public'];
    return this.triggers.removeTriggers(id, schemaList);
  }
}
