import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { IsArray, IsBoolean, IsEmail, IsIn, IsObject, IsString, Length } from 'class-validator';
import { modules, type ModuleId } from '@forgeos/contracts';
import { PlatformService, type AuthActor } from './platform.service';

type AuthRequest = { forgeosAuth: AuthActor };
class OwnerInput { @IsEmail() email!: string; @IsString() @Length(12, 256) password!: string; @IsString() bootstrapPassword!: string; }
class LoginInput { @IsEmail() email!: string; @IsString() password!: string; }
class InvitationInput { @IsEmail() email!: string; @IsIn(['admin', 'member', 'auditor']) role!: 'admin' | 'member' | 'auditor'; }
class AcceptInvitationInput { @IsString() token!: string; @IsString() password!: string; }
class RoleInput { @IsIn(['owner', 'admin', 'member', 'auditor']) role!: 'owner' | 'admin' | 'member' | 'auditor'; }

class WorkspaceInput { @IsString() @Length(1, 100) name!: string; }
class ProjectInput { @IsString() @Length(1, 100) name!: string; @IsArray() @IsIn(modules.map(module => module.id), { each: true }) moduleIds!: ModuleId[]; }
class ModulesInput { @IsArray() @IsIn(modules.map(module => module.id), { each: true }) moduleIds!: ModuleId[]; }
class RunInput { @IsString() projectId!: string; @IsIn(modules.map(module => module.id)) moduleId!: ModuleId; }
class CompleteInput { @IsBoolean() passed!: boolean; }
class ModuleRecordInput { @IsString() @Length(1, 40) recordType!: string; @IsString() @Length(1, 100) name!: string; @IsObject() content!: Record<string, unknown>; }

@Controller()
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}
  @Get('health') health() { return { status: 'ok', mode: process.env.FORGEOS_MODE ?? 'self-hosted' }; }
  @Get('auth/setup') async setupStatus() { return { ownerRequired: await this.platform.ownerRequired() }; }
  @Post('auth/setup') setup(@Body() input: OwnerInput) { return this.platform.setupOwner(input.email, input.password, input.bootstrapPassword); }
  @Post('auth/login') login(@Body() input: LoginInput) { return this.platform.loginUser(input.email, input.password); }
  @Post('auth/accept-invite') acceptInvite(@Body() input: AcceptInvitationInput) { return this.platform.acceptInvitation(input.token, input.password); }
  @Get('auth/session') session(@Req() request: AuthRequest) { return request.forgeosAuth; }
  @Get('modules') listModules() { return modules; }
  @Get('workspaces') workspaces(@Req() request: AuthRequest) { return this.platform.listWorkspaces(request.forgeosAuth); }
  @Post('workspaces') workspace(@Body() input: WorkspaceInput, @Req() request: AuthRequest) { return this.platform.createWorkspace(input.name, request.forgeosAuth); }
  @Patch('workspaces/:id/modules') workspaceModules(@Param('id') id: string, @Body() input: ModulesInput, @Req() request: AuthRequest) { return this.platform.updateWorkspaceModules(id, input.moduleIds, request.forgeosAuth); }
  @Get('workspaces/:id/members') members(@Param('id') id: string, @Req() request: AuthRequest) { return this.platform.listMembers(id, request.forgeosAuth); }
  @Patch('workspaces/:id/members/:userId') memberRole(@Param('id') id: string, @Param('userId') userId: string, @Body() input: RoleInput, @Req() request: AuthRequest) { return this.platform.updateMemberRole(id, userId, input.role, request.forgeosAuth); }
  @Post('workspaces/:id/invitations') invite(@Param('id') id: string, @Body() input: InvitationInput, @Req() request: AuthRequest) { return this.platform.createInvitation(id, input.email, input.role, request.forgeosAuth); }
  @Get('overview') overview(@Req() request: AuthRequest, @Query('workspaceId') workspaceId?: string) { return this.platform.overview(workspaceId, request.forgeosAuth); }
  @Get('projects') projects(@Req() request: AuthRequest, @Query('workspaceId') workspaceId?: string) { return this.platform.listProjects(workspaceId, request.forgeosAuth); }
  @Post('projects') project(@Body() input: ProjectInput, @Req() request: AuthRequest, @Query('workspaceId') workspaceId?: string) { return this.platform.createProject(input.name, input.moduleIds, workspaceId, request.forgeosAuth); }
  @Post('runs') run(@Body() input: RunInput, @Req() request: AuthRequest, @Query('workspaceId') workspaceId?: string) { return this.platform.startRun(input.projectId, input.moduleId, workspaceId, request.forgeosAuth); }
  @Post('runs/:id/complete') complete(@Param('id') id: string, @Body() input: CompleteInput, @Req() request: AuthRequest, @Query('workspaceId') workspaceId?: string) { return this.platform.completeRun(id, input.passed, workspaceId, request.forgeosAuth); }
  @Get('modules/:id/records') moduleRecords(@Param('id') id: ModuleId, @Req() request: AuthRequest, @Query('workspaceId') workspaceId?: string) {
    if (!modules.some(module => module.id === id)) throw new BadRequestException('Unknown module');
    return this.platform.listModuleRecords(id, workspaceId, request.forgeosAuth);
  }
  @Post('modules/:id/records') saveModuleRecord(@Param('id') id: ModuleId, @Body() input: ModuleRecordInput, @Req() request: AuthRequest, @Query('workspaceId') workspaceId?: string) {
    if (!modules.some(module => module.id === id)) throw new BadRequestException('Unknown module');
    return this.platform.saveModuleRecord(id, input.recordType, input.name, input.content, workspaceId, request.forgeosAuth);
  }
}
