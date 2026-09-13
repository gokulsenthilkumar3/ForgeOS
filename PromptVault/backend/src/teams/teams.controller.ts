import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@UseGuards(SupabaseAuthGuard)
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  /** POST /teams — create a team */
  @Post()
  create(@Body() dto: CreateTeamDto, @CurrentUser() user: any) {
    return this.teamsService.create(dto, user.id);
  }

  /** GET /teams/me — get teams the current user belongs to */
  @Get('me')
  findMine(@CurrentUser() user: any) {
    return this.teamsService.findMyTeams(user.id);
  }

  /** GET /teams/:id — get team details */
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.teamsService.findOne(id, user.id);
  }

  /** POST /teams/:id/members — add a member */
  @Post(':id/members')
  addMember(
    @Param('id') id: string,
    @Body() dto: AddMemberDto,
    @CurrentUser() user: any,
  ) {
    return this.teamsService.addMember(id, dto, user.id);
  }

  /** PATCH /teams/:id/members/:memberId — update member role */
  @Patch(':id/members/:memberId')
  updateRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body('role') role: 'viewer' | 'editor' | 'admin',
    @CurrentUser() user: any,
  ) {
    return this.teamsService.updateMemberRole(id, memberId, role, user.id);
  }

  /** DELETE /teams/:id/members/:memberId — remove a member */
  @Delete(':id/members/:memberId')
  removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: any,
  ) {
    return this.teamsService.removeMember(id, memberId, user.id);
  }

  /** DELETE /teams/:id — delete a team */
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.teamsService.remove(id, user.id);
  }
}
