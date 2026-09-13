import { IsIn, IsUUID } from 'class-validator';

export class AddMemberDto {
  @IsUUID()
  user_id: string;

  @IsIn(['viewer', 'editor', 'admin'])
  role: 'viewer' | 'editor' | 'admin';
}
