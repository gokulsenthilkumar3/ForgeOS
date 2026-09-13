import { Injectable, NotFoundException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { CreateVersionDto } from './dto/create-version.dto';
import * as Diff from 'diff';

@Injectable()
export class PromptVersionsService {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  async create(promptId: string, dto: CreateVersionDto) {
    // Auto-increment version number
    const { data: existing } = await this.supabase
      .from('prompt_versions')
      .select('version_number')
      .eq('prompt_id', promptId)
      .order('version_number', { ascending: false })
      .limit(1)
      .single();

    const nextVersion = existing ? existing.version_number + 1 : 1;

    const { data, error } = await this.supabase
      .from('prompt_versions')
      .insert({ ...dto, prompt_id: promptId, version_number: nextVersion })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async findAll(promptId: string) {
    const { data, error } = await this.supabase
      .from('prompt_versions')
      .select('*')
      .eq('prompt_id', promptId)
      .order('version_number', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }

  async findOne(promptId: string, versionId: string) {
    const { data, error } = await this.supabase
      .from('prompt_versions')
      .select('*')
      .eq('prompt_id', promptId)
      .eq('id', versionId)
      .single();
    if (error || !data) throw new NotFoundException('Version not found');
    return data;
  }

  async diff(promptId: string, versionId: string, compareId: string) {
    const [vA, vB] = await Promise.all([
      this.findOne(promptId, versionId),
      this.findOne(promptId, compareId),
    ]);
    const patch = Diff.createPatch(
      `prompt_${promptId}`,
      vA.content,
      vB.content,
      `v${vA.version_number}`,
      `v${vB.version_number}`,
    );
    return { diff: patch, from: vA.version_number, to: vB.version_number };
  }
}
