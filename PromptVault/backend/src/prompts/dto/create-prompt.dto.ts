import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreatePromptDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  created_by?: string;
}
