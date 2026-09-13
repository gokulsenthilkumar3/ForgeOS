import { Injectable, NotFoundException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { UpdatePromptDto } from './dto/update-prompt.dto';

@Injectable()
export class PromptsService {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  async create(dto: CreatePromptDto & { created_by: string }) {
    const { data, error } = await this.supabase
      .from('prompts')
      .insert(dto)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async findAll(userId: string) {
    const { data, error } = await this.supabase
      .from('prompts')
      .select('*')
      .eq('created_by', userId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .from('prompts')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) throw new NotFoundException(`Prompt ${id} not found`);
    return data;
  }

  async update(id: string, dto: UpdatePromptDto) {
    const { data, error } = await this.supabase
      .from('prompts')
      .update(dto)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async remove(id: string) {
    const { error } = await this.supabase.from('prompts').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { message: `Prompt ${id} deleted` };
  }
}
