import { Module } from '@nestjs/common';
import { PromptVersionsController } from './prompt-versions.controller';
import { PromptVersionsService } from './prompt-versions.service';

@Module({
  controllers: [PromptVersionsController],
  providers: [PromptVersionsService],
  exports: [PromptVersionsService],
})
export class PromptVersionsModule {}
