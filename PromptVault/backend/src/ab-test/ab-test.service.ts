import { Injectable, NotFoundException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { RunnerService } from '../runner/runner.service';
import { CreateAbTestDto } from './dto/create-ab-test.dto';

@Injectable()
export class AbTestService {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
  );

  constructor(private readonly runnerService: RunnerService) {}

  /**
   * Run two prompt versions in parallel against the same input.
   * Saves results to ab_tests table and returns side-by-side comparison.
   */
  async run(promptId: string, dto: CreateAbTestDto, userId: string) {
    // Fetch both versions
    const [vA, vB] = await Promise.all([
      this.getVersion(promptId, dto.version_a_id),
      this.getVersion(promptId, dto.version_b_id),
    ]);

    // Run both in parallel
    const [resultA, resultB] = await Promise.all([
      this.runnerService.run(
        vA.content,
        dto.input,
        dto.provider,
        dto.model ?? vA.model,
        vA.temperature,
        dto.api_key,
      ),
      this.runnerService.run(
        vB.content,
        dto.input,
        dto.provider,
        dto.model ?? vB.model,
        vB.temperature,
        dto.api_key,
      ),
    ]);

    // Persist test record
    const { data, error } = await this.supabase
      .from('ab_tests')
      .insert({
        prompt_id: promptId,
        version_a_id: dto.version_a_id,
        version_b_id: dto.version_b_id,
        provider: dto.provider,
        input: dto.input,
        result_a: resultA,
        result_b: resultB,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return {
      test_id: data.id,
      input: dto.input,
      provider: dto.provider,
      version_a: {
        version_id: dto.version_a_id,
        version_number: vA.version_number,
        ...resultA,
      },
      version_b: {
        version_id: dto.version_b_id,
        version_number: vB.version_number,
        ...resultB,
      },
      comparison: {
        latency_winner:
          resultA.latency_ms <= resultB.latency_ms ? 'a' : 'b',
        token_winner:
          (resultA.output_tokens ?? Infinity) <= (resultB.output_tokens ?? Infinity) ? 'a' : 'b',
        output_length_winner:
          resultA.output.length >= resultB.output.length ? 'a' : 'b',
      },
    };
  }

  /** Get all A/B tests for a prompt */
  async findAll(promptId: string) {
    const { data, error } = await this.supabase
      .from('ab_tests')
      .select('*')
      .eq('prompt_id', promptId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }

  /** Get a single A/B test */
  async findOne(id: string) {
    const { data, error } = await this.supabase
      .from('ab_tests')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) throw new NotFoundException(`A/B test ${id} not found`);
    return data;
  }

  /** Set the winner on an A/B test */
  async setWinner(id: string, winner: 'a' | 'b' | 'tie') {
    const { data, error } = await this.supabase
      .from('ab_tests')
      .update({ winner })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  private async getVersion(promptId: string, versionId: string) {
    const { data, error } = await this.supabase
      .from('prompt_versions')
      .select('id, version_number, content, model, temperature')
      .eq('prompt_id', promptId)
      .eq('id', versionId)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Version ${versionId} not found`);
    }
    return data;
  }
}
