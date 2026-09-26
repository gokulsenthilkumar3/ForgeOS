import { Body, Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common';
import { IsIn, IsISO8601, IsString, IsUUID, Length } from 'class-validator';
import { AgentAccessService, type AgentKind } from './agent-access.service';
import type { AuthActor } from './platform.service';

type AuthRequest = { forgeosAuth: AuthActor };
type SignedRequest = { method: string; originalUrl: string; headers: Record<string, string | undefined> };

class RegisterAgentInput {
  @IsUUID() workspaceId!: string;
  @IsString() @Length(1, 80) name!: string;
  @IsIn(['ai', 'rpa', 'test', 'service']) kind!: AgentKind;
  @IsString() publicKeyPem!: string;
  @IsUUID() approvalId!: string;
}
class GrantInput {
  @IsUUID() workspaceId!: string;
  @IsISO8601() expiresAt!: string;
  @IsUUID() approvalId!: string;
}

@Controller('agent-access')
export class AgentAccessController {
  constructor(private readonly access: AgentAccessService) {}

  @Get('agents')
  listAgents(@Query('workspaceId') workspaceId: string, @Req() request: AuthRequest) {
    return this.access.listAgents(workspaceId, request.forgeosAuth);
  }
  @Post('agents')
  register(@Body() input: RegisterAgentInput, @Req() request: AuthRequest) {
    return this.access.register(input.workspaceId, input.name, input.kind, input.publicKeyPem, input.approvalId, request.forgeosAuth);
  }
  @Get('grants')
  listGrants(@Query('workspaceId') workspaceId: string, @Req() request: AuthRequest) {
    return this.access.listGrants(workspaceId, request.forgeosAuth);
  }
  @Post('agents/:id/grants')
  grant(@Param('id') id: string, @Body() input: GrantInput, @Req() request: AuthRequest) {
    return this.access.grant(input.workspaceId, id, input.expiresAt, input.approvalId, request.forgeosAuth);
  }
  @Delete('grants/:id')
  revoke(@Param('id') id: string, @Query('workspaceId') workspaceId: string, @Req() request: AuthRequest) {
    return this.access.revoke(workspaceId, id, request.forgeosAuth);
  }
  @Get('projects')
  projects(@Query('workspaceId') workspaceId: string, @Req() request: SignedRequest) {
    return this.access.signedProjects(workspaceId, request);
  }
}
