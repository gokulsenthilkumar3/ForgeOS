import { Module } from '@nestjs/common';
import { AbTestController } from './ab-test.controller';
import { AbTestService } from './ab-test.service';
import { RunnerModule } from '../runner/runner.module';

@Module({
  imports: [RunnerModule],
  controllers: [AbTestController],
  providers: [AbTestService],
})
export class AbTestModule {}
