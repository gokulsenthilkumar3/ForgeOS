import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { PromptVersionsService } from './prompt-versions.service';
import { CreateVersionDto } from './dto/create-version.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

@UseGuards(SupabaseAuthGuard)
@Controller('prompts/:promptId/versions')
export class PromptVersionsController {
  constructor(private readonly versionsService: PromptVersionsService) {}

  @Post()
  create(@Param('promptId') promptId: string, @Body() dto: CreateVersionDto) {
    return this.versionsService.create(promptId, dto);
  }

  @Get()
  findAll(@Param('promptId') promptId: string) {
    return this.versionsService.findAll(promptId);
  }

  @Get(':versionId')
  findOne(
    @Param('promptId') promptId: string,
    @Param('versionId') versionId: string,
  ) {
    return this.versionsService.findOne(promptId, versionId);
  }

  @Get(':versionId/diff/:compareId')
  diff(
    @Param('promptId') promptId: string,
    @Param('versionId') versionId: string,
    @Param('compareId') compareId: string,
  ) {
    return this.versionsService.diff(promptId, versionId, compareId);
  }
}
