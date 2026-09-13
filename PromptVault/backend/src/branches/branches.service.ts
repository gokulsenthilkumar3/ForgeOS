import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { CreateBranchDto } from './dto/create-branch.dto';

@Injectable()
export class BranchesService {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  /** List all branches for a prompt */
  async findAll(promptId: string) {
    const { data, error } = await this.supabase
      .from('prompt_branches')
      .select('*, head_version:head_version_id(id, version_number, content, model)')
      .eq('prompt_id', promptId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return data;
  }

  /** Get a single branch by name */
  async findOne(promptId: string, branchName: string) {
    const { data, error } = await this.supabase
      .from('prompt_branches')
      .select('*, head_version:head_version_id(id, version_number, content, model, created_at)')
      .eq('prompt_id', promptId)
      .eq('branch_name', branchName)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Branch '${branchName}' not found on prompt ${promptId}`);
    }
    return data;
  }

  /** Create a new branch, optionally seeded from a version */
  async create(promptId: string, dto: CreateBranchDto) {
    // Check prompt exists
    const { data: prompt } = await this.supabase
      .from('prompts')
      .select('id')
      .eq('id', promptId)
      .single();
    if (!prompt) throw new NotFoundException(`Prompt ${promptId} not found`);

    const { data, error } = await this.supabase
      .from('prompt_branches')
      .insert({
        prompt_id: promptId,
        branch_name: dto.branch_name,
        head_version_id: dto.head_version_id ?? null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new ConflictException(`Branch '${dto.branch_name}' already exists`);
      }
      throw new Error(error.message);
    }
    return data;
  }

  /**
   * Rollback: set a branch HEAD to a specific version.
   * This is non-destructive — history is never deleted.
   */
  async rollback(promptId: string, branchName: string, versionId: string) {
    // Verify version belongs to this prompt
    const { data: version } = await this.supabase
      .from('prompt_versions')
      .select('id, version_number')
      .eq('prompt_id', promptId)
      .eq('id', versionId)
      .single();

    if (!version) {
      throw new NotFoundException(`Version ${versionId} not found on prompt ${promptId}`);
    }

    const { data, error } = await this.supabase
      .from('prompt_branches')
      .update({ head_version_id: versionId })
      .eq('prompt_id', promptId)
      .eq('branch_name', branchName)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return {
      message: `Branch '${branchName}' rolled back to version ${version.version_number}`,
      branch: data,
    };
  }

  /**
   * Advance HEAD: called after a new version is saved on a branch.
   * Automatically advances the branch HEAD to the latest version.
   */
  async advanceHead(promptId: string, branchName: string, versionId: string) {
    await this.supabase
      .from('prompt_branches')
      .update({ head_version_id: versionId })
      .eq('prompt_id', promptId)
      .eq('branch_name', branchName);
  }

  /** Delete a branch (cannot delete 'main') */
  async remove(promptId: string, branchName: string) {
    if (branchName === 'main') {
      throw new ConflictException('Cannot delete the main branch');
    }
    const { error } = await this.supabase
      .from('prompt_branches')
      .delete()
      .eq('prompt_id', promptId)
      .eq('branch_name', branchName);

    if (error) throw new Error(error.message);
    return { message: `Branch '${branchName}' deleted` };
  }
}
