import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateConnectionDto {
  @IsString()
  name: string;

  @IsIn(['postgres', 'mysql'])
  engine: 'postgres' | 'mysql';

  @IsString()
  host: string;

  @IsInt() @Min(1) @Max(65535)
  port: number;

  @IsString()
  database: string;

  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsOptional() @IsBoolean()
  ssl?: boolean;
}
