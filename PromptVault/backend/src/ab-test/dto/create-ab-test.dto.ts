import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAbTestDto {
  @IsUUID()
  version_a_id: string;

  @IsUUID()
  version_b_id: string;

  @IsString()
  @IsNotEmpty()
  input: string;

  @IsIn(['openai', 'anthropic', 'google'])
  provider: 'openai' | 'anthropic' | 'google';

  @IsOptional()
  @IsString()
  model?: string;

  /** BYOK: API key for the chosen provider */
  @IsOptional()
  @IsString()
  api_key?: string;
}
