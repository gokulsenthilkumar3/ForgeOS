import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class RunPromptDto {
  @IsString()
  @IsNotEmpty()
  input: string;

  @IsIn(['openai', 'anthropic', 'google'])
  provider: 'openai' | 'anthropic' | 'google';

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  /**
   * User's API key for the chosen provider.
   * Passed per-request (BYOK). Never stored unless user explicitly saves via /api-keys.
   */
  @IsOptional()
  @IsString()
  api_key?: string;
}
