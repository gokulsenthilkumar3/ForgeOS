import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AlertsService, AlertRule } from './alerts.service';

@Controller('alert-rules')
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get()
  list(@Query('connectionId') connectionId?: string) {
    return this.alerts.listRules(connectionId);
  }

  @Post()
  create(@Body() body: Omit<AlertRule, 'id' | 'createdAt'>) {
    return this.alerts.createRule(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Partial<AlertRule>) {
    return this.alerts.updateRule(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.alerts.deleteRule(id);
  }
}
