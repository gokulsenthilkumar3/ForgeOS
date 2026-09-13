import { Request } from 'express';

export interface JwtUser {
  userId: string;
  email: string;
  role: string;
}

export interface RequestWithUser extends Request {
  user: JwtUser;
}
