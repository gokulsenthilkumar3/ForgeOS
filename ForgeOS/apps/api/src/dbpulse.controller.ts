import { BadRequestException, Body, Controller, Delete, ForbiddenException, Param, Post, Query, Req } from '@nestjs/common';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { DbPulseService, type DbConnectionInput, type DbSource } from './dbpulse.service';
import { PlatformService, type AuthActor } from './platform.service';
import type { DbMapping } from './dbpulse-engine';

class ConnectionInput {
  @IsIn(['postgres', 'mysql']) engine!: 'postgres' | 'mysql';
  @IsString() @Length(1,253) host!: string;
  @IsInt() @Min(1) @Max(65535) port!: number;
  @IsString() @Length(1,253) database!: string;
  @IsString() @Length(1,253) username!: string;
  @IsString() @Length(1,4096) password!: string;
  @IsBoolean() tls!: boolean;
  @IsOptional() @IsString() @Length(0,20000) ca?: string;
}
@Controller('dbpulse')
export class DbPulseController {
  constructor(private readonly platform: PlatformService, private readonly dbpulse: DbPulseService) {}
  private async scope(workspaceId: string | undefined, actor: AuthActor) {
    if (!workspaceId || !/^[0-9a-f-]{36}$/i.test(workspaceId)) throw new BadRequestException('Select a workspace before connecting.');
    if (actor.kind !== 'user') throw new ForbiddenException('A signed-in workspace user is required.');
    const workspace = await this.platform.authorizeWorkspaceRole(workspaceId, actor, ['owner', 'admin', 'member']);
    if (!workspace.moduleIds.includes('dbpulse')) throw new ForbiddenException('DB Pulse is disabled for this workspace.');
    return actor.userId + ':' + workspace.id;
  }
  @Post('connections') async connect(@Body() input: ConnectionInput, @Query('workspaceId') id: string | undefined, @Req() req: { forgeosAuth: AuthActor }) {
    return this.dbpulse.connect(await this.scope(id, req.forgeosAuth), input as DbConnectionInput);
  }
  @Delete('connections/:connectionId') async disconnect(@Param('connectionId') connectionId: string, @Query('workspaceId') id: string | undefined, @Req() req: { forgeosAuth: AuthActor }) {
    return this.dbpulse.disconnect(connectionId, await this.scope(id, req.forgeosAuth));
  }
  @Post('columns') async columns(@Body() input: DbSource, @Query('workspaceId') id: string | undefined, @Req() req: { forgeosAuth: AuthActor }) {
    return this.dbpulse.discover(await this.scope(id, req.forgeosAuth), input || {} as DbSource);
  }
  @Post('compare') async compare(@Body() input: { left: DbSource; right: DbSource; mappings: DbMapping[]; limit: number }, @Query('workspaceId') id: string | undefined, @Req() req: { forgeosAuth: AuthActor }) {
    const scope = await this.scope(id, req.forgeosAuth);
    if (!input?.left || !input.right) throw new BadRequestException('Connect both database sources first.');
    return this.dbpulse.compare(scope, input.left, input.right, input.mappings, input.limit);
  }
}
