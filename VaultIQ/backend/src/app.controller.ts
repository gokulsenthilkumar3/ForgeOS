import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class AppController {
  @Get('health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Health check endpoint for Render / load balancer' })
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'vaultiq-backend',
    };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  root() {
    return { message: 'VaultIQ API is running. See /api/docs for documentation.' };
  }
}
