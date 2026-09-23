import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { IsArray, IsBoolean, IsIn, IsString, Length } from 'class-validator';
import { modules, type ModuleId } from '@forgeos/contracts';
import { PlatformService } from './platform.service';

class WorkspaceInput { @IsString() @Length(1, 100) name!: string; }
class ProjectInput { @IsString() @Length(1, 100) name!: string; @IsArray() @IsIn(modules.map(module => module.id), { each: true }) moduleIds!: ModuleId[]; }
class ModulesInput { @IsArray() @IsIn(modules.map(module => module.id), { each: true }) moduleIds!: ModuleId[]; }
class RunInput { @IsString() projectId!: string; @IsIn(modules.map(module => module.id)) moduleId!: ModuleId; }
class CompleteInput { @IsBoolean() passed!: boolean; }

@Controller()
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}
  @Get('health') health() { return { status: 'ok', mode: process.env.FORGEOS_MODE ?? 'self-hosted' }; }
  @Get('modules') listModules() { return modules; }
  @Get('workspaces') workspaces() { return this.platform.listWorkspaces(); }
  @Post('workspaces') workspace(@Body() input: WorkspaceInput) { return this.platform.createWorkspace(input.name); }
  @Patch('workspaces/:id/modules') workspaceModules(@Param('id') id: string, @Body() input: ModulesInput) { return this.platform.updateWorkspaceModules(id, input.moduleIds); }
  @Get('overview') overview(@Query('workspaceId') workspaceId?: string) { return this.platform.overview(workspaceId); }
  @Get('projects') projects(@Query('workspaceId') workspaceId?: string) { return this.platform.listProjects(workspaceId); }
  @Post('projects') project(@Body() input: ProjectInput, @Query('workspaceId') workspaceId?: string) { return this.platform.createProject(input.name, input.moduleIds, workspaceId); }
  @Post('runs') run(@Body() input: RunInput, @Query('workspaceId') workspaceId?: string) { return this.platform.startRun(input.projectId, input.moduleId, workspaceId); }
  @Post('runs/:id/complete') complete(@Param('id') id: string, @Body() input: CompleteInput, @Query('workspaceId') workspaceId?: string) { return this.platform.completeRun(id, input.passed, workspaceId); }
}
