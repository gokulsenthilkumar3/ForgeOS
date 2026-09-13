import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { CreateTeamDto } from './dto/create-team.dto';
import { AddMemberDto } from './dto/add-member.dto';

@Injectable()
export class TeamsService {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  /** Create a team and auto-add the creator as admin */
  async create(dto: CreateTeamDto, ownerId: string) {
    const { data: team, error } = await this.supabase
      .from('teams')
      .insert({ name: dto.name, owner_id: ownerId })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Add owner as admin member
    await this.supabase.from('team_members').insert({
      team_id: team.id,
      user_id: ownerId,
      role: 'admin',
    });

    return team;
  }

  /** Get all teams the user belongs to */
  async findMyTeams(userId: string) {
    const { data, error } = await this.supabase
      .from('team_members')
      .select('role, teams(id, name, owner_id, created_at)')
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return data;
  }

  /** Get team details + members */
  async findOne(teamId: string, userId: string) {
    const { data: team, error } = await this.supabase
      .from('teams')
      .select('*, team_members(user_id, role, joined_at)')
      .eq('id', teamId)
      .single();

    if (error || !team) throw new NotFoundException(`Team ${teamId} not found`);

    const isMember = team.team_members.some((m: any) => m.user_id === userId);
    if (!isMember) throw new ForbiddenException('You are not a member of this team');

    return team;
  }

  /** Add a member to a team (admin/owner only) */
  async addMember(teamId: string, dto: AddMemberDto, requesterId: string) {
    await this.assertAdmin(teamId, requesterId);

    const { data, error } = await this.supabase
      .from('team_members')
      .insert({ team_id: teamId, user_id: dto.user_id, role: dto.role })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') throw new ConflictException('User is already a member');
      throw new Error(error.message);
    }
    return data;
  }

  /** Update a member's role */
  async updateMemberRole(
    teamId: string,
    memberId: string,
    role: 'viewer' | 'editor' | 'admin',
    requesterId: string,
  ) {
    await this.assertAdmin(teamId, requesterId);

    const { data, error } = await this.supabase
      .from('team_members')
      .update({ role })
      .eq('team_id', teamId)
      .eq('user_id', memberId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  /** Remove a member from a team */
  async removeMember(teamId: string, memberId: string, requesterId: string) {
    await this.assertAdmin(teamId, requesterId);

    const { error } = await this.supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', memberId);

    if (error) throw new Error(error.message);
    return { message: `Member removed from team` };
  }

  /** Delete the team (owner only) */
  async remove(teamId: string, requesterId: string) {
    const { data: team } = await this.supabase
      .from('teams')
      .select('owner_id')
      .eq('id', teamId)
      .single();

    if (!team) throw new NotFoundException(`Team ${teamId} not found`);
    if (team.owner_id !== requesterId) throw new ForbiddenException('Only the owner can delete this team');

    const { error } = await this.supabase.from('teams').delete().eq('id', teamId);
    if (error) throw new Error(error.message);
    return { message: `Team deleted` };
  }

  private async assertAdmin(teamId: string, userId: string) {
    const { data } = await this.supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .single();

    if (!data || !['admin'].includes(data.role)) {
      // Also check if owner
      const { data: team } = await this.supabase
        .from('teams')
        .select('owner_id')
        .eq('id', teamId)
        .single();

      if (!team || team.owner_id !== userId) {
        throw new ForbiddenException('Admin access required');
      }
    }
  }
}
