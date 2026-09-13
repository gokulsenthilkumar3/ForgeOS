import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { RunnerService } from './runner.service';
import { RunPromptDto } from './dto/run-prompt.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { createClient } from '@supabase/supabase-js';

@UseGuards(SupabaseAuthGuard)
@Controller('prompts/:promptId/versions/:versionId/run')
export class RunnerController {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  constructor(private readonly runnerService: RunnerService) {}

  /**
   * POST /prompts/:promptId/versions/:versionId/run
   * Executes a specific prompt version against the chosen AI provider.
   */
  @Post()
  async run(
    @Param('promptId') promptId: string,
    @Param('versionId') versionId: string,
    @Body() dto: RunPromptDto,
  ) {
    // Fetch the version content
    const { data: version, error } = await this.supabase
      .from('prompt_versions')
      .select('content, model, temperature')
      .eq('prompt_id', promptId)
      .eq('id', versionId)
      .single();

    if (error || !version) {
      throw new NotFoundException(`Version ${versionId} not found`);
    }

    const result = await this.runnerService.run(
      version.content,
      dto.input,
      dto.provider,
      dto.model ?? version.model,
      dto.temperature ?? version.temperature,
      dto.api_key,
    );

    return result;
  }
}
