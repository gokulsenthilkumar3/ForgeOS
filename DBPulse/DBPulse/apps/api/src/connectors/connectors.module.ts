import { Module, forwardRef } from '@nestjs/common';
import { ConnectorsService } from './connectors.service';
import { ConnectorsController } from './connectors.controller';
import { TriggersService } from './triggers.service';
import { TriggersController } from './triggers.controller';
import { ReconnectService } from './reconnect.service';
import { PipelineModule } from '../pipeline/pipeline.module';

@Module({
  imports: [forwardRef(() => PipelineModule)],
  providers: [ConnectorsService, TriggersService, ReconnectService],
  controllers: [ConnectorsController, TriggersController],
  exports: [ConnectorsService, ReconnectService],
})
export class ConnectorsModule {}
