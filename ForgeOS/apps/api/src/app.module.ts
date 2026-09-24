import { Module } from '@nestjs/common'; import { APP_GUARD } from '@nestjs/core'; import { PlatformController } from './platform.controller'; import { PlatformService } from './platform.service'; import { SessionGuard } from './session.guard';
@Module({ controllers: [PlatformController], providers: [PlatformService, { provide: APP_GUARD, useClass: SessionGuard }] }) export class AppModule {}
