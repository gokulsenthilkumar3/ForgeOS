import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateBranchDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9_\-\/]+$/, {
    message: 'Branch name can only contain letters, numbers, hyphens, underscores, and slashes',
  })
  branch_name: string;

  /** Optional: seed the branch HEAD from an existing version */
  head_version_id?: string;
}
