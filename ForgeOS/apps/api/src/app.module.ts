import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';
import { SessionGuard } from './session.guard';
import { AgentAccessController } from './agent-access.controller';
import { AgentAccessService } from './agent-access.service';
import { DbPulseController } from './dbpulse.controller';
import { DbPulseService } from './dbpulse.service';

@Module({
  controllers: [PlatformController, AgentAccessController, DbPulseController],
  providers: [PlatformService, AgentAccessService, DbPulseService, { provide: APP_GUARD, useClass: SessionGuard }],
})
export class AppModule {}
