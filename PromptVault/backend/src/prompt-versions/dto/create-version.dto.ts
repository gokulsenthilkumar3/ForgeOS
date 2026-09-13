import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateVersionDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsNumber()
  temperature?: number;
}
