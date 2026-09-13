import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class UpsertApiKeyDto {
  @IsIn(['openai', 'anthropic', 'google'])
  provider: 'openai' | 'anthropic' | 'google';

  @IsString()
  @IsNotEmpty()
  api_key: string;
}
