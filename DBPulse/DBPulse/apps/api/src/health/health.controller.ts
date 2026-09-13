import { Controller, Get, Param } from '@nestjs/common';
import { HealthService } from './health.service';
import { Public } from '../auth/public.decorator';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Public()
  @Get()
  system() {
    return this.health.getSystemHealth();
  }

  @Get('connections/:id')
  connection(@Param('id') id: string) {
    return this.health.checkConnection(id);
  }
}
