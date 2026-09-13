import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PromptsModule } from './prompts/prompts.module';
import { PromptVersionsModule } from './prompt-versions/prompt-versions.module';
import { BranchesModule } from './branches/branches.module';
import { RunnerModule } from './runner/runner.module';
import { AbTestModule } from './ab-test/ab-test.module';
import { TeamsModule } from './teams/teams.module';
import { ApiKeysModule } from './api-keys/api-keys.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Module 1 — Core prompts + versioning
    PromptsModule,
    PromptVersionsModule,
    // Module 2 — Branches & rollback
    BranchesModule,
    // Module 4 — LLM Runner + A/B testing
    RunnerModule,
    AbTestModule,
    // Module 5 — Teams & workspaces
    TeamsModule,
    // Module 6 — API key vault
    ApiKeysModule,
  ],
})
export class AppModule {}
